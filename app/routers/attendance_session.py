from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role

from app.models.timetable import Timetable
from app.models.attendance_session import AttendanceSession
from app.models.attendance import Module


router = APIRouter(
    prefix="/attendance-session",
    tags=["Attendance Sessions"],
)


# =========================================================
# START ATTENDANCE SESSION
# =========================================================

@router.post("/start")
def start_attendance_session(
    current_user=Depends(
        require_role("lecturer")
    ),
    db: Session = Depends(get_db),
):

    lecturer_id = current_user["user_id"]

    now = datetime.now()
    today = now.date()
    current_time = now.time()
    day = now.strftime("%A")

    # -----------------------------------------------------
    # FIND CURRENT CLASS
    # -----------------------------------------------------

    classes = db.query(
        Timetable
    ).filter(
        Timetable.lecturer_id == lecturer_id,
        Timetable.day_of_week == day,
        Timetable.start_time <= current_time,
        Timetable.end_time >= current_time,
        Timetable.active == True,
    ).all()

    if not classes:

        raise HTTPException(
            status_code=400,
            detail=(
                "You do not have a scheduled "
                "class at this time."
            )
        )

    # -----------------------------------------------------
    # MULTIPLE CLASSES
    # -----------------------------------------------------

    if len(classes) > 1:

        return {
            "success": False,
            "multiple_classes": True,
            "message": (
                "More than one class is scheduled "
                "at this time. Select the class "
                "you want to start."
            ),
            "classes": [
                {
                    "timetable_id": item.id,
                    "module_id": item.module_id,
                    "laboratory": item.laboratory,
                    "start_time": str(
                        item.start_time
                    ),
                    "end_time": str(
                        item.end_time
                    ),
                }
                for item in classes
            ],
        }

    timetable = classes[0]

    # -----------------------------------------------------
    # CHECK EXISTING ACTIVE SESSION
    # -----------------------------------------------------

    existing = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.lecturer_id == lecturer_id,
        AttendanceSession.session_date == today,
        AttendanceSession.status == "active",
    ).first()

    if existing:

        module = db.query(Module).filter(
            Module.id == existing.module_id
        ).first()

        return {
            "success": True,
            "already_active": True,
            "session_id": existing.id,
            "module_id": existing.module_id,
            "module_code": (
                module.module_code
                if module else None
            ),
            "module_name": (
                module.module_name
                if module else None
            ),
            "laboratory": existing.laboratory,
            "opened_at": str(
                existing.opened_at
            ),
        }

    # -----------------------------------------------------
    # CREATE SESSION
    # -----------------------------------------------------

    session = AttendanceSession(
        timetable_id=timetable.id,
        lecturer_id=lecturer_id,
        module_id=timetable.module_id,
        laboratory=timetable.laboratory,
        session_date=today,
        opened_at=now,
        status="active",
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    module = db.query(Module).filter(
        Module.id == session.module_id
    ).first()

    return {
        "success": True,
        "message": (
            "Attendance session started successfully."
        ),
        "session_id": session.id,
        "module_id": session.module_id,
        "module_code": (
            module.module_code
            if module else None
        ),
        "module_name": (
            module.module_name
            if module else None
        ),
        "laboratory": session.laboratory,
        "opened_at": str(
            session.opened_at
        ),
        "status": session.status,
    }


# =========================================================
# CLOSE ATTENDANCE SESSION
# =========================================================

@router.post("/close")
def close_attendance_session(
    current_user=Depends(
        require_role("lecturer")
    ),
    db: Session = Depends(get_db),
):

    lecturer_id = current_user["user_id"]

    session = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.lecturer_id == lecturer_id,
        AttendanceSession.status == "active",
    ).order_by(
        AttendanceSession.opened_at.desc()
    ).first()

    if not session:

        raise HTTPException(
            status_code=404,
            detail="No active attendance session found."
        )

    now = datetime.now()

    session.closed_at = now
    session.status = "closed"

    db.commit()
    db.refresh(session)

    return {
        "success": True,
        "message": (
            "Attendance session closed successfully."
        ),
        "session_id": session.id,
        "module_id": session.module_id,
        "closed_at": str(
            session.closed_at
        ),
        "status": session.status,
    }


# =========================================================
# CURRENT ACTIVE SESSION
# =========================================================

@router.get("/current")
def current_attendance_session(
    current_user=Depends(
        require_role("lecturer")
    ),
    db: Session = Depends(get_db),
):

    lecturer_id = current_user["user_id"]

    session = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.lecturer_id == lecturer_id,
        AttendanceSession.status == "active",
    ).order_by(
        AttendanceSession.opened_at.desc()
    ).first()

    if not session:

        return {
            "success": True,
            "active": False,
            "message": "No active attendance session."
        }

    module = db.query(Module).filter(
        Module.id == session.module_id
    ).first()

    return {
        "success": True,
        "active": True,
        "session_id": session.id,
        "module_id": session.module_id,
        "module_code": (
            module.module_code
            if module else None
        ),
        "module_name": (
            module.module_name
            if module else None
        ),
        "laboratory": session.laboratory,
        "session_date": str(
            session.session_date
        ),
        "opened_at": str(
            session.opened_at
        ),
        "status": session.status,
    }