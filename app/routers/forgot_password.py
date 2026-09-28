
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
from app.email_service import send_password_reset_email


router = APIRouter(
    prefix="/auth",
    tags=["Password Recovery"]
)


# =========================================================
# TEMPORARY RESET TOKEN STORAGE
# =========================================================

reset_tokens = {}


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
def forgot_password(
    request: ForgotPasswordRequest
):

    email = request.email.strip().lower()

    db: Session = SessionLocal()

    try:

        # -------------------------------------------------
        # CHECK STUDENT
        # -------------------------------------------------

        student = db.query(Student).filter(
            Student.email == email
        ).first()

        if student:

            user_id = student.id
            user_type = "student"

        else:

            # ---------------------------------------------
            # CHECK EMPLOYEE
            # ---------------------------------------------

            employee = db.query(Employee).filter(
                Employee.email == email
            ).first()

            if employee:

                user_id = employee.id
                user_type = "employee"

            else:

                # -----------------------------------------
                # CHECK SUPER ADMIN
                # -----------------------------------------

                admin = db.query(SuperAdmin).filter(
                    SuperAdmin.email == email
                ).first()

                if admin:

                    user_id = admin.id
                    user_type = "super_admin"

                else:

                    # -------------------------------------
                    # INVALID EMAIL
                    # -------------------------------------

                    raise HTTPException(
                        status_code=404,
                        detail="Invalid email address. No LabGuard account was found."
                    )


        # -------------------------------------------------
        # GENERATE SECURE RESET TOKEN
        # -------------------------------------------------

        reset_token = secrets.token_urlsafe(32)

        expires_at = (
            datetime.now(timezone.utc)
            + timedelta(minutes=30)
        )

        reset_tokens[reset_token] = {
            "user_id": user_id,
            "user_type": user_type,
            "email": email,
            "expires_at": expires_at
        }


        # -------------------------------------------------
        # CREATE RESET LINK
        # -------------------------------------------------

        reset_link = (
            "http://localhost:5173/reset-password"
            f"?token={reset_token}"
        )


        # -------------------------------------------------
        # SEND RESET EMAIL
        # -------------------------------------------------

        send_password_reset_email(
            email,
            reset_link
        )


        return {
            "message": "A password reset link has been sent to your email."
        }


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to send password reset email: {str(e)}"
        )


    finally:

        db.close()


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest
):

    # -----------------------------------------------------
    # CHECK PASSWORDS MATCH
    # -----------------------------------------------------

    if request.new_password != request.confirm_password:

        raise HTTPException(
            status_code=400,
            detail="Passwords do not match."
        )


    # -----------------------------------------------------
    # FIND RESET TOKEN
    # -----------------------------------------------------

    reset_data = reset_tokens.get(
        request.reset_token
    )

    if reset_data is None:

        raise HTTPException(
            status_code=403,
            detail="Invalid or expired password reset link."
        )


    # -----------------------------------------------------
    # CHECK TOKEN EXPIRATION
    # -----------------------------------------------------

    if datetime.now(timezone.utc) > reset_data["expires_at"]:

        del reset_tokens[
            request.reset_token
        ]

        raise HTTPException(
            status_code=403,
            detail="Password reset link has expired."
        )


    # -----------------------------------------------------
    # HASH NEW PASSWORD
    # -----------------------------------------------------

    new_password_hash = hash_password(
        request.new_password
    )


    db: Session = SessionLocal()

    try:

        # -------------------------------------------------
        # FIND USER
        # -------------------------------------------------

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


        # -------------------------------------------------
        # CHECK USER EXISTS
        # -------------------------------------------------

        if not user:

            raise HTTPException(
                status_code=404,
                detail="User not found."
            )


        # -------------------------------------------------
        # UPDATE PASSWORD
        # -------------------------------------------------

        user.password_hash = new_password_hash

        db.commit()


        # -------------------------------------------------
        # DELETE USED TOKEN
        # -------------------------------------------------

        del reset_tokens[
            request.reset_token
        ]


        return {
            "message": (
                "Password reset successfully. "
                "You can now login with your new password."
            )
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

