
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.student import Student
from app.models.employee import Employee
from app.models.admin import SuperAdmin
from app.security import hash_password
from app.email_service import send_password_reset_email


router = APIRouter(
    prefix="/auth",
    tags=["Password Recovery"],
)


# =========================================================
# TEMPORARY PASSWORD RESET TOKEN STORAGE
# =========================================================

password_reset_tokens = {}


def create_password_reset_link(
    user_id: int,
    user_type: str,
    email: str,
):
    reset_token = secrets.token_urlsafe(32)

    expires_at = (
        datetime.now(timezone.utc) + timedelta(minutes=30)
    )

    password_reset_tokens[reset_token] = {
        "user_id": user_id,
        "user_type": user_type,
        "email": email.strip().lower(),
        "expires_at": expires_at,
    }

    frontend_url = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173",
    ).rstrip("/")

    reset_link = (
        f"{frontend_url}/reset-password?token={reset_token}"
    )

    return reset_token, reset_link


# =========================================================
# REQUEST MODELS
# =========================================================

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str


# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    email = request.email.strip().lower()

    db: Session = SessionLocal()

    try:
        # Search students
        student = db.query(Student).filter(
            Student.email == email
        ).first()

        if student:
            user_id = student.id
            user_type = "student"

        else:
            # Search employees
            employee = db.query(Employee).filter(
                Employee.email == email
            ).first()

            if employee:
                user_id = employee.id
                user_type = "employee"

            else:
                # Search super admin
                admin = db.query(SuperAdmin).filter(
                    SuperAdmin.email == email
                ).first()

                if admin:
                    user_id = admin.id
                    user_type = "super_admin"

                else:
                    # Do not reveal whether the email exists
                    return {
                        "message": (
                            "If the email exists, a password reset "
                            "link has been sent."
                        )
                    }

        # Generate and store the reset token
        reset_token, reset_link = create_password_reset_link(
            user_id=user_id,
            user_type=user_type,
            email=email,
        )

        # Send the password-reset email
        send_password_reset_email(
            email,
            reset_link,
        )

        return {
            "message": (
                "If the email exists, a password reset "
                "link has been sent."
            )
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to send password reset email.",
        )

    finally:
        db.close()


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):

    # Check that passwords match
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match.",
        )

    # Find reset token
    reset_data = password_reset_tokens.get(
        request.reset_token
    )

    if not reset_data:
        raise HTTPException(
            status_code=403,
            detail="Invalid or expired password reset link.",
        )

    # Check token expiration
    if datetime.now(timezone.utc) > reset_data["expires_at"]:
        password_reset_tokens.pop(
            request.reset_token,
            None,
        )

        raise HTTPException(
            status_code=403,
            detail="Password reset link has expired.",
        )

    # Hash the new password
    new_password_hash = hash_password(
        request.new_password
    )

    db: Session = SessionLocal()

    try:
        # Find the account
        if reset_data["user_type"] == "student":
            user = db.query(Student).filter(
                Student.id == reset_data["user_id"]
            ).first()

        elif reset_data["user_type"] == "employee":
            user = db.query(Employee).filter(
                Employee.id == reset_data["user_id"]
            ).first()

        elif reset_data["user_type"] == "super_admin":
            user = db.query(SuperAdmin).filter(
                SuperAdmin.id == reset_data["user_id"]
            ).first()

        else:
            raise HTTPException(
                status_code=403,
                detail="Invalid password reset request.",
            )

        # Check that the account exists
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

        # Update the password
        user.password_hash = new_password_hash
        db.commit()

        # Make the token single-use
        password_reset_tokens.pop(
            request.reset_token,
            None,
        )

        return {
            "message": "Password reset successfully."
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to reset password.",
        )

    finally:
        db.close()
