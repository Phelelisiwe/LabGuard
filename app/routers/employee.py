from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.attendance import Module, Attendance
from app.dependencies import require_role


router = APIRouter(
    prefix="/employee",
    tags=["Employee / Lecturer"]
)


@router.get("/me")
def get_employee_profile(
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):

    employee = db.query(Employee).filter(
        Employee.id == current_user["user_id"]
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return {
        "id": employee.id,
        "employee_number": employee.employee_number,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "email": employee.email,
        "role": employee.role
    }


@router.get("/modules")
def get_lecturer_modules(
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):

    modules = db.query(Module).filter(
        Module.lecturer_id == current_user["user_id"]
    ).all()

    return [
        {
            "id": module.id,
            "module_code": module.module_code,
            "module_name": module.module_name
        }
        for module in modules
    ]


@router.get("/modules/{module_id}/attendance")
def get_lecturer_attendance(
    module_id: int,
    attendance_date: date | None = None,
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):

    module = db.query(Module).filter(
        Module.id == module_id,
        Module.lecturer_id == current_user["user_id"]
    ).first()

    if not module:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this module"
        )

    query = db.query(Attendance).filter(
        Attendance.module_id == module_id
    )

    if attendance_date:
        query = query.filter(
            Attendance.date == attendance_date
        )

    records = query.order_by(
        Attendance.date.desc(),
        Attendance.time_in.desc()
    ).all()

    result = []

    for record in records:

        student = record.student

        result.append({
            "attendance_id": record.id,
            "student_number": student.student_number,
            "student_name": (
                f"{student.first_name} "
                f"{student.last_name}"
            ),
            "date": record.date,
            "time_in": record.time_in,
            "time_out": record.time_out,
            "present": True
        })

    return result