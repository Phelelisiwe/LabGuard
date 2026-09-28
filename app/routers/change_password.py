from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets

from app.database import SessionLocal
from app.models.student import Student
from app.models.employee import Employee
from app.models.admin import SuperAdmin
from app.security import hash_password
router = APIRouter(
    prefix="/auth",
    tags=["Password Recovery"]
)


# Temporary password reset tokens
password_reset_tokens = {}


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str


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

                # Search Super Admin
                admin = db.query(SuperAdmin).filter(
                    SuperAdmin.email == email
                ).first()

                if admin:
                    user_id = admin.id
                    user_type = "super_admin"

                else:
                    # Do not reveal whether an email exists
                    return {
                        "message": "If the email exists, a password reset link has been sent."
                    }

        # Generate secure token
        reset_token = secrets.token_urlsafe(32)

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        password_reset_tokens[reset_token] = {
            "user_id": user_id,
            "user_type": user_type,
            "email": email,
            "expires_at": expires_at
        }

        # Reset link
        reset_link = (
            f"http://localhost:5173/reset-password"
            f"?token={reset_token}"
        )

        # TEMPORARY:
        # Print the link in the backend terminal.
        #
        # We will connect this to your existing email.py
        # after confirming its email function.
        print()
        print("========================================")
        print("PASSWORD RESET LINK")
        print(reset_link)
        print("========================================")
        print()

        return {
            "message": "If the email exists, a password reset link has been sent."
        }

    finally:
        db.close()


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):

    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match."
        )

    reset_data = password_reset_tokens.get(
        request.reset_token
    )

    if not reset_data:
        raise HTTPException(
            status_code=403,
            detail="Invalid or expired password reset link."
        )

    # Check expiry
    if datetime.now(timezone.utc) > reset_data["expires_at"]:

        del password_reset_tokens[
            request.reset_token
        ]

        raise HTTPException(
            status_code=403,
            detail="Password reset link has expired."
        )

    new_password_hash = hash_password(
        request.new_password
    )

    db: Session = SessionLocal()

    try:

        if reset_data["user_type"] == "student":

            user = db.query(Student).filter(
                Student.id == reset_data["user_id"]
            ).first()

        elif reset_data["user_type"] == "employee":

            user = db.query(Employee).filter(
                Employee.id == reset_data["user_id"]
            ).first()

        else:

            user = db.query(SuperAdmin).filter(
                SuperAdmin.id == reset_data["user_id"]
            ).first()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        user.password_hash = new_password_hash

        db.commit()

        # Make the reset link single-use
        del password_reset_tokens[
            request.reset_token
        ]

        return {
            "message": "Password reset successfully."
        }

    except HTTPException:
        raise

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to reset password."
        )

    finally:
        db.close()