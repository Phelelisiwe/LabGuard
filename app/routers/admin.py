from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.admin import SuperAdmin
from app.models.student import Student
from app.models.employee import Employee
from app.models.attendance import Module, StudentModule

from app.schemas.student import StudentCreate
from app.schemas.employee import EmployeeCreate

from app.security import hash_password
from app.dependencies import require_role


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
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):

    if student.password != student.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    existing_student_number = db.query(Student).filter(
        Student.student_number == student.student_number
    ).first()

    if existing_student_number:
        raise HTTPException(
            status_code=400,
            detail="Student number already exists"
        )

    existing_email = db.query(Student).filter(
        Student.email == student.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Student email already exists"
        )

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
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):

    if employee.password != employee.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    existing_employee_number = db.query(Employee).filter(
        Employee.employee_number == employee.employee_number
    ).first()

    if existing_employee_number:
        raise HTTPException(
            status_code=400,
            detail="Employee number already exists"
        )

    existing_email = db.query(Employee).filter(
        Employee.email == employee.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Employee email already exists"
        )

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
    current_user=Depends(require_role("super_admin")),
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
    current_user=Depends(require_role("super_admin")),
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


# =========================================================
# GET ALL STUDENTS
# =========================================================

@router.get("/students")
def get_all_students(
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):

    students = db.query(Student).all()

    return [
        {
            "id": student.id,
            "student_number": student.student_number,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "course": student.course,
            "current_year": student.current_year,
            "email": student.email,
            "email_verified": student.email_verified
        }
        for student in students
    ]


# =========================================================
# GET ALL EMPLOYEES
# =========================================================

@router.get("/employees")
def get_all_employees(
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):

    employees = db.query(Employee).all()

    return [
        {
            "id": employee.id,
            "employee_number": employee.employee_number,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "email": employee.email,
            "role": employee.role,
            "email_verified": employee.email_verified
        }
        for employee in employees
    ]


# =========================================================
# GET ALL MODULES
# =========================================================

# =========================================================
# GET ALL MODULES
# =========================================================

@router.get("/modules")
def get_all_modules(
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):

    modules = db.query(Module).order_by(
        Module.level,
        Module.module_name
    ).all()

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
            )
        }
        for module in modules
    ]

# =========================================================
# ASSIGN LECTURER TO MODULE
# =========================================================

@router.put("/modules/{module_id}/assign-lecturer")
def assign_lecturer_to_module(
    module_id: int,
    lecturer_id: int,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):

    # Find the module
    module = db.query(Module).filter(
        Module.id == module_id
    ).first()

    if not module:
        raise HTTPException(
            status_code=404,
            detail="Module not found"
        )

    # Find the employee
    lecturer = db.query(Employee).filter(
        Employee.id == lecturer_id
    ).first()

    if not lecturer:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Make sure the employee is a lecturer
    if lecturer.role != "Lecturer":
        raise HTTPException(
            status_code=400,
            detail="Selected employee is not a Lecturer"
        )

    # Assign lecturer
    module.lecturer_id = lecturer.id

    db.commit()
    db.refresh(module)

    return {
        "success": True,
        "message": "Lecturer assigned to module successfully",
        "module_id": module.id,
        "module_code": module.module_code,
        "module_name": module.module_name,
        "lecturer_id": lecturer.id,
        "lecturer_name": f"{lecturer.first_name} {lecturer.last_name}"
    }

# =========================================================
# GET ALL STUDENT-MODULE ASSIGNMENTS
# =========================================================

@router.get("/student-modules")
def get_all_student_module_assignments(
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):

    assignments = db.query(StudentModule).all()

    return [
        {
            "id": assignment.id,
            "student_id": assignment.student_id,
            "module_id": assignment.module_id
        }
        for assignment in assignments
    ]