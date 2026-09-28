from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student
from app.models.attendance import StudentModule, Attendance, Module
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
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db)
):

    student = db.query(Student).filter(
        Student.id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return {
        "id": student.id,
        "student_number": student.student_number,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "course": student.course,
        "current_year": student.current_year,
        "email": student.email
    }


# =========================================================
# GET AVAILABLE MODULES FOR STUDENT
# =========================================================

@router.get("/modules")
def get_student_modules(
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db)
):

    student = db.query(Student).filter(
        Student.id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    # Get modules up to the student's current level
    modules = db.query(Module).filter(
        Module.level == student.current_year
    ).order_by(
        Module.level,
        Module.module_name
    ).all()

    # Get modules already selected by this student
    selected_module_ids = {
        registration.module_id
        for registration in db.query(StudentModule).filter(
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
                if module.lecturer
                else None
            ),
            "selected": module.id in selected_module_ids
        }
        for module in modules
    ]


# =========================================================
# GET STUDENT ATTENDANCE
# =========================================================

@router.get("/attendance")
def get_my_attendance(
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db)
):

    records = (
        db.query(Attendance)
        .filter(
            Attendance.student_id ==
            current_user["user_id"]
        )
        .order_by(
            Attendance.date.desc(),
            Attendance.time_in.desc()
        )
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
            "present": True
        }
        for record in records
    ]