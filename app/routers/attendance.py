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