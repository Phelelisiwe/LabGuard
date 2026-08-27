from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets

from app.database import get_db
from app.models.admin import SuperAdmin
from app.models.otp import OTP
from app.schemas.auth import LoginRequest
from app.security import verify_password, hash_password
from app.email import send_otp_email



router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login")
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    # Find Super Admin by email
    admin = db.query(SuperAdmin).filter(
        SuperAdmin.email == login_data.email
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(
        login_data.password,
        admin.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Generate 6-digit OTP
    otp = str(secrets.randbelow(900000) + 100000)

    # Hash OTP before saving it
    otp_hash = hash_password(otp)

    # OTP expires after 3 minutes
    expires_at = datetime.utcnow() + timedelta(minutes=3)

    # Remove any previous OTP for this email
    db.query(OTP).filter(
        OTP.email == admin.email
    ).delete()

    # Save new OTP
    new_otp = OTP(
        email=admin.email,
        otp_hash=otp_hash,
        expires_at=expires_at
    )

    db.add(new_otp)
    db.commit()

    # Send OTP to email
    try:
        send_otp_email(admin.email, otp)
    except Exception as e:
        # Remove OTP if email failed
        db.delete(new_otp)
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to send OTP email: {str(e)}"
        )

    return {
        "success": True,
        "message": "Password verified. OTP sent to your email.",
        "email": admin.email
    }