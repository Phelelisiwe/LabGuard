from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student
from app.schemas.student import StudentCreate
from app.security import hash_password


router = APIRouter(
    prefix="/students",
    tags=["Students"]
)


@router.post("/register")
def register_student(
    student: StudentCreate,
    db: Session = Depends(get_db)
):

    if student.password != student.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match"
        )

    existing_student = db.query(Student).filter(
        Student.student_number == student.student_number
    ).first()

    if existing_student:
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
            detail="Email already exists"
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