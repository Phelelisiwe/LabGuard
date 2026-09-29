
import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


# =========================================================
# SEND LOGIN OTP EMAIL
# =========================================================

def send_otp_email(receiver_email: str, otp: str):

    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_APP_PASSWORD")

    if not smtp_email or not smtp_password:
        raise ValueError(
            "SMTP email settings are not configured"
        )

    message = EmailMessage()

    message["Subject"] = "LabGuard Login OTP"
    message["From"] = os.getenv("SMTP_SENDER")
    message["To"] = receiver_email

    message.set_content(
        f"""Hello,

Your LabGuard login verification code is:

{otp}

This OTP is required to complete your LabGuard login.

If you did not attempt to log in, please ignore this email.

Regards,
LabGuard System
"""
    )

    with smtplib.SMTP("smtp-relay.brevo.com", 587) as server:
        server.starttls()
        server.login(
            smtp_email,
            smtp_password
        )
        server.send_message(message)


# =========================================================
# SEND PASSWORD RESET EMAIL
# =========================================================

def send_password_reset_email(
    receiver_email: str,
    reset_link: str
):

    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_APP_PASSWORD")

    if not smtp_email or not smtp_password:
        raise ValueError(
            "SMTP email settings are not configured"
        )

    message = EmailMessage()

    message["Subject"] = "LabGuard Password Reset"
    message["From"] = os.getenv("SMTP_SENDER")
    message["To"] = receiver_email

    message.set_content(
        f"""Hello,

A request was made to reset your LabGuard password.

Click the link below to create a new password:

{reset_link}

This password reset link will expire after 30 minutes.

If you did not request a password reset, please ignore this email.

Regards,
LabGuard System
"""
    )

    with smtplib.SMTP("smtp-relay.brevo.com", 587) as server:
        server.starttls()
        server.login(
            smtp_email,
            smtp_password
        )
        server.send_message(message)
