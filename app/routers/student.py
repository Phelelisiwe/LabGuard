from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student
from app.models.attendance import StudentModule, Attendance, Module
from app.models.notification import (
    ClassNotification,
    StudentNotificationRead,
)
from app.dependencies import require_role


router = APIRouter(
    prefix="/student",
    tags=["Student"]
)


# =========================================================
# GET STUDENT PROFILE
# =========================================================

@router.get("/me")
def get_student_profile(
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "id": student.id,
        "student_number": student.student_number,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "course": student.course,
        "current_year": student.current_year,
        "email": student.email,
    }


# =========================================================
# GET AVAILABLE MODULES FOR STUDENT
# =========================================================

@router.get("/modules")
def get_student_modules(
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    modules = db.query(Module).filter(
        Module.level == student.current_year
    ).order_by(Module.level, Module.module_name).all()

    selected_module_ids = {
        r.module_id
        for r in db.query(StudentModule).filter(
            StudentModule.student_id == student.id
        ).all()
    }

    return [
        {
            "id": module.id,
            "module_code": module.module_code,
            "module_name": module.module_name,
            "level": module.level,
            "lecturer_id": module.lecturer_id,
            "lecturer_name": (
                f"{module.lecturer.first_name} {module.lecturer.last_name}"
                if module.lecturer else None
            ),
            "selected": module.id in selected_module_ids,
        }
        for module in modules
    ]


# =========================================================
# GET STUDENT ATTENDANCE (unchanged)
# =========================================================

@router.get("/attendance")
def get_my_attendance(
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    records = (
        db.query(Attendance)
        .filter(Attendance.student_id == current_user["user_id"])
        .order_by(Attendance.date.desc(), Attendance.time_in.desc())
        .all()
    )

    return [
        {
            "attendance_id": record.id,
            "module_id": record.module_id,
            "module_code": record.module.module_code,
            "module_name": record.module.module_name,
            "date": record.date,
            "time_in": record.time_in,
            "time_out": record.time_out,
            "present": True,
        }
        for record in records
    ]


# =========================================================
# NOTIFICATIONS — list with read / unread status
# =========================================================

def _notification_module_ids_subq(db: Session, student_id: int):
    return (
        db.query(StudentModule.module_id)
        .filter(StudentModule.student_id == student_id)
        .subquery()
    )


def _read_ids_subq(db: Session, student_id: int):
    return (
        db.query(StudentNotificationRead.notification_id)
        .filter(StudentNotificationRead.student_id == student_id)
        .subquery()
    )


@router.get("/notifications")
def get_my_notifications(
    unread_only: bool = False,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """
    Return the student's notifications with a `read` flag.

    Query params:
      - unread_only=true  → only return notifications not yet marked read
                            (use this to drive popups/toasts in the UI)
    """
    student_id = current_user["user_id"]

    module_ids_subq = _notification_module_ids_subq(db, student_id)
    read_ids_subq = _read_ids_subq(db, student_id)

    q = (
        db.query(ClassNotification, Module)
        .join(Module, Module.id == ClassNotification.module_id)
        .filter(ClassNotification.module_id.in_(module_ids_subq))
    )

    if unread_only:
        q = q.filter(~ClassNotification.id.in_(read_ids_subq))

    rows = (
        q.order_by(ClassNotification.created_at.desc())
        .limit(50)
        .all()
    )

    # Which of the returned notifications has this student read?
    read_ids = {
        row[0]
        for row in db.query(StudentNotificationRead.notification_id)
        .filter(StudentNotificationRead.student_id == student_id)
        .all()
    }

    # Unread count for the whole inbox (badge number)
    unread_count = (
        db.query(ClassNotification)
        .filter(ClassNotification.module_id.in_(module_ids_subq))
        .filter(~ClassNotification.id.in_(read_ids_subq))
        .count()
    )

    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": notification.id,
                "module_id": notification.module_id,
                "module_code": module.module_code,
                "type": notification.type,
                "title": notification.title,
                "message": notification.message,
                "created_at": notification.created_at.isoformat(),
                "read": notification.id in read_ids,
            }
            for notification, module in rows
        ],
    }


@router.get("/notifications/unread-count")
def get_unread_count(
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """Lightweight endpoint for the frontend to poll (e.g. every 30s)."""
    student_id = current_user["user_id"]

    module_ids_subq = _notification_module_ids_subq(db, student_id)
    read_ids_subq = _read_ids_subq(db, student_id)

    unread = (
        db.query(ClassNotification)
        .filter(ClassNotification.module_id.in_(module_ids_subq))
        .filter(~ClassNotification.id.in_(read_ids_subq))
        .count()
    )

    return {"unread_count": unread}


# =========================================================
# NOTIFICATIONS — mark as read
# =========================================================

@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student_id = current_user["user_id"]

    # Verify the notification belongs to a module the student is in
    in_module = (
        db.query(ClassNotification)
        .join(StudentModule, StudentModule.module_id == ClassNotification.module_id)
        .filter(
            ClassNotification.id == notification_id,
            StudentModule.student_id == student_id,
        )
        .first()
    )
    if not in_module:
        raise HTTPException(status_code=404, detail="Notification not found")

    existing = (
        db.query(StudentNotificationRead)
        .filter(
            StudentNotificationRead.student_id == student_id,
            StudentNotificationRead.notification_id == notification_id,
        )
        .first()
    )

    if not existing:
        db.add(StudentNotificationRead(
            student_id=student_id,
            notification_id=notification_id,
        ))
        db.commit()

    return {"status": "ok", "notification_id": notification_id, "read": True}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student_id = current_user["user_id"]

    module_ids_subq = _notification_module_ids_subq(db, student_id)
    read_ids_subq = _read_ids_subq(db, student_id)

    unread_ids = [
        row[0]
        for row in (
            db.query(ClassNotification.id)
            .filter(ClassNotification.module_id.in_(module_ids_subq))
            .filter(~ClassNotification.id.in_(read_ids_subq))
            .all()
        )
    ]

    if unread_ids:
        db.add_all([
            StudentNotificationRead(
                student_id=student_id,
                notification_id=nid,
            )
            for nid in unread_ids
        ])
        db.commit()

    return {"status": "ok", "marked_read": len(unread_ids)}
