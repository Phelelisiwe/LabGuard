from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets

from app.database import get_db

from app.models.admin import SuperAdmin
from app.models.student import Student
from app.models.employee import Employee
from app.models.otp import OTP

from app.schemas.auth import LoginRequest

from app.security import verify_password, hash_password
from app.email_service import send_otp_email


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login")
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):

    user = None
    role = None

    # -------------------------
    # SUPER ADMIN
    # -------------------------

    admin = db.query(SuperAdmin).filter(
        SuperAdmin.email == login_data.email
    ).first()

    if admin:
        user = admin
        role = "super_admin"

    # -------------------------
    # EMPLOYEE / LECTURER
    # -------------------------

    if not user:

        employee = db.query(Employee).filter(
            Employee.email == login_data.email
        ).first()

        if employee:
            user = employee
            role = employee.role

    # -------------------------
    # STUDENT
    # -------------------------

    if not user:

        student = db.query(Student).filter(
            Student.email == login_data.email
        ).first()

        if student:
            user = student
            role = "student"

    # -------------------------
    # USER NOT FOUND
    # -------------------------

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # -------------------------
    # PASSWORD
    # -------------------------

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # -------------------------
    # CREATE OTP
    # -------------------------

    otp = str(
        secrets.randbelow(900000) + 100000
    )

    otp_hash = hash_password(otp)

    expires_at = (
        datetime.utcnow()
        + timedelta(minutes=3)
    )

    # Remove previous OTPs
    db.query(OTP).filter(
        OTP.email == user.email
    ).delete()

    new_otp = OTP(
        email=user.email,
        otp_hash=otp_hash,
        expires_at=expires_at
    )

    db.add(new_otp)
    db.commit()

    # -------------------------
    # SEND EMAIL
    # -------------------------

    try:

        send_otp_email(
            user.email,
            otp
        )

    except Exception as e:

        db.delete(new_otp)
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to send OTP email: {str(e)}"
        )

    return {
        "success": True,
        "message": "Password verified. OTP sent to your email.",
        "email": user.email,
        "role": role
    }