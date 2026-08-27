from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import SuperAdmin
from app.models.student import Student
from app.models.employee import Employee
from app.schemas.student import StudentCreate
from app.schemas.employee import EmployeeCreate
from app.security import hash_password


router = APIRouter(
    prefix="/admin",
    tags=["Super Admin"]
)


# =========================================================
# REGISTER STUDENT
# =========================================================

@router.post("/students/register")
def register_student(
    student: StudentCreate,
    db: Session = Depends(get_db)
):
    # Check that passwords match
    if student.password != student.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    # Check student number
    existing_student_number = db.query(Student).filter(
        Student.student_number == student.student_number
    ).first()

    if existing_student_number:
        raise HTTPException(
            status_code=400,
            detail="Student number already exists"
        )

    # Check email
    existing_email = db.query(Student).filter(
        Student.email == student.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Student email already exists"
        )

    # Create student
    new_student = Student(
        student_number=student.student_number,
        first_name=student.first_name,
        last_name=student.last_name,
        course=student.course,
        current_year=student.current_year,
        email=student.email,
        password_hash=hash_password(student.password),
        email_verified=False
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return {
        "success": True,
        "message": "Student registered successfully",
        "student_number": new_student.student_number,
        "email": new_student.email
    }


# =========================================================
# REGISTER EMPLOYEE
# =========================================================

@router.post("/employees/register")
def register_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db)
):
    # Check that passwords match
    if employee.password != employee.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    # Check employee number
    existing_employee_number = db.query(Employee).filter(
        Employee.employee_number == employee.employee_number
    ).first()

    if existing_employee_number:
        raise HTTPException(
            status_code=400,
            detail="Employee number already exists"
        )

    # Check email
    existing_email = db.query(Employee).filter(
        Employee.email == employee.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Employee email already exists"
        )

    # Create employee
    new_employee = Employee(
        employee_number=employee.employee_number,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        role=employee.role.value,
        password_hash=hash_password(employee.password),
        email_verified=False
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return {
        "success": True,
        "message": "Employee registered successfully",
        "employee_number": new_employee.employee_number,
        "email": new_employee.email,
        "role": new_employee.role
    }
# =========================================================
# DELETE STUDENT
# =========================================================

@router.delete("/students/{student_number}")
def delete_student(
    student_number: str,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.student_number == student_number
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    db.delete(student)
    db.commit()

    return {
        "success": True,
        "message": "Student deleted successfully",
        "student_number": student_number
    }


# =========================================================
# DELETE EMPLOYEE
# =========================================================

@router.delete("/employees/{employee_number}")
def delete_employee(
    employee_number: str,
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(
        Employee.employee_number == employee_number
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    db.delete(employee)
    db.commit()

    return {
        "success": True,
        "message": "Employee deleted successfully",
        "employee_number": employee_number
    }