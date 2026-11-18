from datetime import datetime
import math

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.time_utils import sa_now

from app.models.timetable import Timetable
from app.models.attendance_session import AttendanceSession
from app.models.attendance import Module, StudentModule, Attendance


router = APIRouter(
    prefix="/attendance-session",
    tags=["Attendance Sessions"],
)


# =========================================================
# ATTENDANCE SESSION PAYLOADS
# =========================================================

class StartAttendancePayload(BaseModel):
    timetable_id: int | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


def close_expired_attendance_sessions(db: Session) -> None:
    """Close active sessions whose scheduled end time has passed."""
    now = sa_now()
    today = now.date()

    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == "active",
        AttendanceSession.session_date == today,
    ).all()

    changed = False
    for session in sessions:
        timetable = db.query(Timetable).filter(
            Timetable.id == session.timetable_id
        ).first()

        if timetable and now.time() >= timetable.end_time:
            session.closed_at = now
            session.status = "closed"
            changed = True

    if changed:
        db.commit()


# =========================================================
# LECTURER SCHEDULE - AUTHENTICATED
# =========================================================

@router.get("/schedule")
def lecturer_schedule(
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db),
):
    lecturer_id = current_user["user_id"]
    today = sa_now().strftime("%A")

    schedule = db.query(Timetable).filter(
        Timetable.lecturer_id == lecturer_id,
        Timetable.active.is_(True),
    ).order_by(
        Timetable.day_of_week,
        Timetable.start_time,
    ).all()

    today_schedule = [
        item for item in schedule
        if item.day_of_week == today
    ]

    return {
        "success": True,
        "today": today,
        "schedule": [
            {
                "timetable_id": item.id,
                "module_id": item.module_id,
                "module_code": (
                    item.module.module_code if item.module else None
                ),
                "module_name": (
                    item.module.module_name if item.module else None
                ),
                "day_of_week": item.day_of_week,
                "start_time": str(item.start_time),
                "end_time": str(item.end_time),
                "laboratory": item.laboratory,
                "is_today": item.day_of_week == today,
            }
            for item in schedule
        ],
        "today_schedule": [
            {
                "timetable_id": item.id,
                "module_id": item.module_id,
                "module_code": (
                    item.module.module_code if item.module else None
                ),
                "module_name": (
                    item.module.module_name if item.module else None
                ),
                "day_of_week": item.day_of_week,
                "start_time": str(item.start_time),
                "end_time": str(item.end_time),
                "laboratory": item.laboratory,
            }
            for item in today_schedule
        ],
    }


# =========================================================
# START ATTENDANCE SESSION - LECTURER
# =========================================================

@router.post("/start")
def start_attendance_session(
    payload: StartAttendancePayload = StartAttendancePayload(),
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db),
):
    lecturer_id = current_user["user_id"]

    now = sa_now()
    today = now.date()
    current_time = now.time()
    day = now.strftime("%A")

    close_expired_attendance_sessions(db)

    classes = db.query(Timetable).filter(
        Timetable.lecturer_id == lecturer_id,
        Timetable.day_of_week == day,
        Timetable.start_time <= current_time,
        Timetable.end_time >= current_time,
        Timetable.active.is_(True),
    ).all()

    if payload.timetable_id is not None:
        selected = next(
            (item for item in classes if item.id == payload.timetable_id),
            None,
        )
        if selected is None:
            raise HTTPException(
                status_code=400,
                detail="This class is not scheduled and active right now.",
            )
        classes = [selected]

    if not classes:
        raise HTTPException(
            status_code=400,
            detail="You do not have a scheduled class at this time.",
        )

    if len(classes) > 1:
        return {
            "success": False,
            "multiple_classes": True,
            "message": (
                "More than one class is scheduled at this time. "
                "Select the class you want to start."
            ),
            "classes": [
                {
                    "timetable_id": item.id,
                    "module_id": item.module_id,
                    "module_code": item.module.module_code if item.module else None,
                    "module_name": item.module.module_name if item.module else None,
                    "laboratory": item.laboratory,
                    "start_time": str(item.start_time),
                    "end_time": str(item.end_time),
                }
                for item in classes
            ],
        }

    timetable = classes[0]

    existing = db.query(AttendanceSession).filter(
        AttendanceSession.lecturer_id == lecturer_id,
        AttendanceSession.session_date == today,
        AttendanceSession.status == "active",
    ).first()

    if existing:
        module = db.query(Module).filter(
            Module.id == existing.module_id
        ).first()

        if payload.latitude is not None and payload.longitude is not None:
            existing.latitude = payload.latitude
            existing.longitude = payload.longitude
            db.commit()
            db.refresh(existing)

        return {
            "success": True,
            "already_active": True,
            "session_id": existing.id,
            "module_id": existing.module_id,
            "module_code": module.module_code if module else None,
            "module_name": module.module_name if module else None,
            "laboratory": existing.laboratory,
            "opened_at": str(existing.opened_at),
            "latitude": existing.latitude,
            "longitude": existing.longitude,
        }

    session = AttendanceSession(
        timetable_id=timetable.id,
        lecturer_id=lecturer_id,
        module_id=timetable.module_id,
        laboratory=timetable.laboratory,
        session_date=today,
        opened_at=now,
        latitude=payload.latitude,
        longitude=payload.longitude,
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
        "message": "Attendance session started successfully.",
        "session_id": session.id,
        "module_id": session.module_id,
        "module_code": module.module_code if module else None,
        "module_name": module.module_name if module else None,
        "laboratory": session.laboratory,
        "opened_at": str(session.opened_at),
        "latitude": session.latitude,
        "longitude": session.longitude,
        "status": session.status,
    }


# =========================================================
# CLOSE ATTENDANCE SESSION - LECTURER
# =========================================================

@router.post("/close")
def close_attendance_session(
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db),
):
    lecturer_id = current_user["user_id"]
    close_expired_attendance_sessions(db)

    session = db.query(AttendanceSession).filter(
        AttendanceSession.lecturer_id == lecturer_id,
        AttendanceSession.status == "active",
    ).order_by(
        AttendanceSession.opened_at.desc()
    ).first()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="No active attendance session found.",
        )

    session.closed_at = sa_now()
    session.status = "closed"

    db.commit()
    db.refresh(session)

    return {
        "success": True,
        "message": "Attendance session closed successfully.",
        "session_id": session.id,
        "module_id": session.module_id,
        "closed_at": str(session.closed_at),
        "status": session.status,
    }


# =========================================================
# CURRENT ACTIVE SESSION - LECTURER
# =========================================================

@router.get("/current")
def current_attendance_session(
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db),
):
    lecturer_id = current_user["user_id"]
    close_expired_attendance_sessions(db)

    session = db.query(AttendanceSession).filter(
        AttendanceSession.lecturer_id == lecturer_id,
        AttendanceSession.status == "active",
    ).order_by(
        AttendanceSession.opened_at.desc()
    ).first()

    if not session:
        return {
            "success": True,
            "active": False,
            "message": "No active attendance session.",
        }

    module = db.query(Module).filter(
        Module.id == session.module_id
    ).first()

    return {
        "success": True,
        "active": True,
        "session_id": session.id,
        "module_id": session.module_id,
        "module_code": module.module_code if module else None,
        "module_name": module.module_name if module else None,
        "laboratory": session.laboratory,
        "session_date": str(session.session_date),
        "opened_at": str(session.opened_at),
        "latitude": session.latitude,
        "longitude": session.longitude,
        "status": session.status,
    }


# =========================================================
# CURRENT ACTIVE SESSION - STUDENT
# Only sessions for modules the student is registered for.
# =========================================================

@router.get("/student/current")
def student_current_attendance_session(
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student_id = current_user["user_id"]
    close_expired_attendance_sessions(db)
    today = sa_now().date()

    session = (
        db.query(AttendanceSession)
        .join(
            StudentModule,
            StudentModule.module_id == AttendanceSession.module_id,
        )
        .filter(
            StudentModule.student_id == student_id,
            AttendanceSession.status == "active",
            AttendanceSession.session_date == today,
        )
        .order_by(AttendanceSession.opened_at.desc())
        .first()
    )

    if not session:
        return {
            "success": True,
            "active": False,
            "message": (
                "No active attendance session for your registered modules."
            ),
        }

    module = db.query(Module).filter(
        Module.id == session.module_id
    ).first()

    return {
        "success": True,
        "active": True,
        "session_id": session.id,
        "module_id": session.module_id,
        "module_code": module.module_code if module else None,
        "module_name": module.module_name if module else None,
        "laboratory": session.laboratory,
        "session_date": str(session.session_date),
        "opened_at": str(session.opened_at),
        "latitude": session.latitude,
        "longitude": session.longitude,
        "status": session.status,
    }


# =========================================================
# GPS WEBSITE ATTENDANCE
# =========================================================

class GPSCheckInPayload(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


def calculate_distance_metres(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate the distance between two GPS coordinates."""
    earth_radius = 6_371_000

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    return earth_radius * 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(max(0.0, 1.0 - a)),
    )


# =========================================================
# GPS CHECK-IN - STUDENT
# =========================================================

@router.post("/gps/check-in")
def gps_check_in(
    payload: GPSCheckInPayload,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student_id = current_user["user_id"]
    now = sa_now()
    today = now.date()

    session = db.query(AttendanceSession).filter(
        AttendanceSession.status == "active",
        AttendanceSession.session_date == today,
    ).order_by(
        AttendanceSession.opened_at.desc()
    ).first()

    if not session:
        raise HTTPException(
            status_code=400,
            detail="There is no active attendance session.",
        )

    if session.latitude is None or session.longitude is None:
        raise HTTPException(
            status_code=400,
            detail="This session has no saved GPS location.",
        )

    registration = db.query(StudentModule).filter(
        StudentModule.student_id == student_id,
        StudentModule.module_id == session.module_id,
    ).first()

    if not registration:
        raise HTTPException(
            status_code=403,
            detail="You are not registered for this module.",
        )

    distance = calculate_distance_metres(
        session.latitude,
        session.longitude,
        payload.latitude,
        payload.longitude,
    )

    allowed_distance = 50

    if distance > allowed_distance:
        raise HTTPException(
            status_code=403,
            detail=(
                f"You are approximately {round(distance)} metres "
                "from the class location. You must be within "
                f"{allowed_distance} metres to check in."
            ),
        )

    existing = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.module_id == session.module_id,
        Attendance.date == session.session_date,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already been marked present for this class.",
        )

    attendance = Attendance(
        student_id=student_id,
        module_id=session.module_id,
        date=session.session_date,
        time_in=now,
    )

    try:
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not record GPS attendance.",
        )

    return {
        "success": True,
        "message": "GPS attendance recorded successfully.",
        "attendance_id": attendance.id,
        "module_id": attendance.module_id,
        "date": str(attendance.date),
        "time_in": str(attendance.time_in),
        "distance_metres": round(distance, 2),
    }
