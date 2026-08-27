from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.otp import OTP
from app.schemas.otp import VerifyOTPRequest
from app.security import verify_password
from app.auth_token import create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/verify-otp")
def verify_login_otp(
    data: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    # Find OTP for this email
    otp_record = (
        db.query(OTP)
        .filter(OTP.email == data.email)
        .order_by(OTP.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="OTP not found"
        )

    # Check expiry
    if datetime.utcnow() > otp_record.expires_at:
        db.delete(otp_record)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired"
        )

    # Verify OTP
    if not verify_password(data.otp, otp_record.otp_hash):
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    # OTP is correct
    db.delete(otp_record)
    db.commit()

    return {
        "success": True,
        "message": "OTP verified successfully",
        "email": data.email
    
    
    }