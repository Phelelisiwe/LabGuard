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
from app.location import calculate_distance_metres


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
            "Please use the LabGuard fingerprint circuit. "
            "The first scan records check-in and the second scan records checkout."
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

    raise HTTPException(
        status_code=403,
        detail=(
            "Direct attendance checkout is disabled. "
            "Please use the fingerprint circuit scanner. "
            "The first scan records check-in and the second scan records checkout."
        ),
    )


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

    raise HTTPException(
        status_code=403,
        detail=(
            "GPS check-in is disabled. "
            "Use the LabGuard fingerprint circuit scanner. "
            "The first scan records check-in and the second scan records checkout."
        ),
    )
