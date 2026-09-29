from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import delete
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

    # ---------------------------------
    # Find user
    # ---------------------------------

    user = None
    role = None

    admin = db.query(SuperAdmin).filter(
        SuperAdmin.email == login_data.email
    ).first()

    if admin:
        user = admin
        role = "super_admin"

    if not user:
        employee = db.query(Employee).filter(
            Employee.email == login_data.email
        ).first()

        if employee:
            user = employee
            role = employee.role

    if not user:
        student = db.query(Student).filter(
            Student.email == login_data.email
        ).first()

        if student:
            user = student
            role = "student"

    # ---------------------------------
    # User not found
    # ---------------------------------

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # ---------------------------------
    # Check password
    # ---------------------------------

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # ---------------------------------
    # Generate OTP
    # ---------------------------------

    otp = str(
        secrets.randbelow(900000) + 100000
    )

    otp_hash = hash_password(otp)

    expires_at = (
        datetime.utcnow()
        + timedelta(minutes=3)
    )

    # ---------------------------------
    # Remove previous OTPs
    #
    # IMPORTANT:
    # Use a database-level DELETE instead
    # of db.delete(otp_object).
    # ---------------------------------

    db.execute(
        delete(OTP).where(
            OTP.email == user.email
        )
    )

    # ---------------------------------
    # Create new OTP
    # ---------------------------------

    new_otp = OTP(
        email=user.email,
        otp_hash=otp_hash,
        expires_at=expires_at
    )

    db.add(new_otp)

    # Send the email before committing
    # the new OTP.
    try:

        send_otp_email(
            user.email,
            otp
        )

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to send OTP email: {str(e)}"
        )

    # ---------------------------------
    # Save OTP
    # ---------------------------------

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save OTP: {str(e)}"
        )

    # ---------------------------------
    # Successful login step
    # ---------------------------------

    return {
        "success": True,
        "message": "Password verified. OTP sent to your email.",
        "email": user.email,
        "role": role
    }