import math
from pydantic import BaseModel, Field
from app.models.attendance_session import AttendanceSession
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attendance import (
    Attendance,
    Module,
    StudentModule,
)
from app.models.student import Student
from app.schemas.attendance import (
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceResponse,
)
from app.dependencies import require_role


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)


# =========================================================
# DIRECT CHECK-IN
# =========================================================
#
# Attendance must be verified using ONE biometric method:
#
#     FACE
#       OR
#  FINGERPRINT
#
# The actual biometric attendance endpoints are located in:
#
# /biometric/attendance/face/verify
# /biometric/attendance/fingerprint/verify
#
# This endpoint is intentionally disabled so a student cannot
# bypass biometric verification.
#


@router.post(
    "/check-in",
    response_model=AttendanceResponse,
)
def check_in(
    data: AttendanceCheckIn,
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    raise HTTPException(
        status_code=403,
        detail=(
            "Direct attendance check-in is disabled. "
            "Please use Face OR Fingerprint verification."
        ),
    )


# =========================================================
# CHECK-OUT
# =========================================================

@router.post(
    "/check-out",
    response_model=AttendanceResponse,
)
def check_out(
    data: AttendanceCheckOut,
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    student_id = current_user["user_id"]

    today = datetime.now().date()

    attendance = db.query(
        Attendance
    ).filter(
        Attendance.student_id == student_id,
        Attendance.module_id == data.module_id,
        Attendance.date == today,
    ).first()

    if not attendance:

        raise HTTPException(
            status_code=404,
            detail="No check-in record found for today.",
        )

    if attendance.time_out is not None:

        raise HTTPException(
            status_code=400,
            detail="Student has already checked out.",
        )

    attendance.time_out = datetime.now().time()

    db.commit()
    db.refresh(attendance)

    return attendance


# =========================================================
# GET MODULE ATTENDANCE
# =========================================================

@router.get(
    "/module/{module_id}",
    response_model=list[AttendanceResponse],
)
def get_module_attendance(
    module_id: int,
    current_user=Depends(
        require_role("lecturer")
    ),
    db: Session = Depends(get_db),
):

    module = db.query(
        Module
    ).filter(
        Module.id == module_id,
        Module.lecturer_id == current_user["user_id"],
    ).first()

    if not module:

        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this module.",
        )

    attendance_records = db.query(
        Attendance
    ).filter(
        Attendance.module_id == module_id,
    ).order_by(
        Attendance.date.desc(),
        Attendance.time_in.desc(),
    ).all()

    return attendance_records


# =========================================================
# GET STUDENT ATTENDANCE
# =========================================================

@router.get(
    "/student/{student_id}",
    response_model=list[AttendanceResponse],
)
def get_student_attendance(
    student_id: int,
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    if student_id != current_user["user_id"]:

        raise HTTPException(
            status_code=403,
            detail=(
                "You can only view your own attendance."
            ),
        )

    attendance_records = db.query(
        Attendance
    ).filter(
        Attendance.student_id == student_id,
    ).order_by(
        Attendance.date.desc(),
        Attendance.time_in.desc(),
    ).all()

    return attendance_records

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


@router.post("/gps/check-in")
def gps_check_in(
    payload: GPSCheckInPayload,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student_id = current_user["user_id"]
    now = datetime.now()
    today = now.date()

    # Find the active session for today.
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
            detail="The classroom location has not been saved.",
        )

    # Confirm the student is registered for this module.
    registration = db.query(StudentModule).filter(
        StudentModule.student_id == student_id,
        StudentModule.module_id == session.module_id,
    ).first()

    if not registration:
        raise HTTPException(
            status_code=403,
            detail="You are not registered for this module.",
        )

    # Compare the student's location with the session location.
    distance = calculate_distance_metres(
        session.latitude,
        session.longitude,
        payload.latitude,
        payload.longitude,
    )

    # GPS proximity alone cannot guarantee that someone is inside.
    # Use a conservative radius and test its accuracy at your lab.
    allowed_distance = 10

    if distance > allowed_distance:
        raise HTTPException(
            status_code=403,
            detail=(
                f"You are approximately {round(distance, 1)} metres "
                "from the classroom location. Move closer to check in."
            ),
        )

    # Prevent duplicate attendance for the same module and date.
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
        "module_id": session.module_id,
        "date": str(attendance.date),
        "time_in": str(attendance.time_in),
        "distance_metres": round(distance, 2),
        "method": "gps",
    }
