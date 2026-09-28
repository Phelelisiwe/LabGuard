from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attendance import StudentModule, Module
from app.models.student import Student
from app.schemas.student_module import (
    StudentModuleResponse
)
from app.dependencies import require_role

router = APIRouter(
    prefix="/student-modules",
    tags=["Student Modules"]
)


# =========================================================
# STUDENT SELECT MODULE
# =========================================================

@router.post("/assign", response_model=StudentModuleResponse)
def assign_student_to_module(
    module_id: int,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db)
):

    # Get the logged-in student
    student = db.query(Student).filter(
        Student.id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    # Find the selected module
    module = db.query(Module).filter(
        Module.id == module_id
    ).first()

    if not module:
        raise HTTPException(
            status_code=404,
            detail="Module not found"
        )

    # Student cannot select a module above their level
    if module.level > student.current_year:
        raise HTTPException(
            status_code=400,
            detail="You cannot select a module above your current level"
        )

    # Check if the student already selected this module
    existing = db.query(StudentModule).filter(
        StudentModule.student_id == student.id,
        StudentModule.module_id == module.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already selected this module"
        )

    # Create student-module relationship
    assignment = StudentModule(
        student_id=student.id,
        module_id=module.id
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment
# =========================================================
# GET STUDENT'S SELECTED MODULES
# =========================================================

@router.get("/", response_model=list[StudentModuleResponse])
def get_my_modules(
    current_user=Depends(require_role("student")),
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

    assignments = db.query(StudentModule).filter(
        StudentModule.student_id == student.id
    ).all()

    return assignments