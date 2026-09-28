from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.otp import OTP
from app.schemas.otp import VerifyOTPRequest
from app.security import verify_password
from app.auth_token import create_access_token

from app.models.admin import SuperAdmin
from app.models.student import Student
from app.models.employee import Employee


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/verify-otp")
def verify_login_otp(
    data: VerifyOTPRequest,
    db: Session = Depends(get_db)
):

    # Get the latest OTP
    otp_record = (
        db.query(OTP)
        .order_by(OTP.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="OTP not found"
        )

    # Check expiration
    if datetime.utcnow() > otp_record.expires_at:

        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    # Check OTP
    if not verify_password(
        data.otp,
        otp_record.otp_hash
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    email = otp_record.email

    # Find user
    admin = db.query(SuperAdmin).filter(
        SuperAdmin.email == email
    ).first()

    if admin:

        user_id = admin.id
        role = "super_admin"

    else:

        employee = db.query(Employee).filter(
            Employee.email == email
        ).first()

        if employee:

            user_id = employee.id
            role = employee.role

        else:

            student = db.query(Student).filter(
                Student.email == email
            ).first()

            if not student:
                raise HTTPException(
                    status_code=404,
                    detail="User account not found"
                )

            user_id = student.id
            role = "student"

    # Create JWT
    access_token = create_access_token(
        email=email,
        role=role,
        user_id=user_id
    )

    # Delete used OTP
    db.delete(otp_record)
    db.commit()

    return {
        "success": True,
        "message": "OTP verified successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "email": email,
        "role": role,
        "user_id": user_id
    }