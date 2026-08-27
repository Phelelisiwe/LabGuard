import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


def send_otp_email(receiver_email: str, otp: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_APP_PASSWORD")

    if not smtp_email or not smtp_password:
        raise ValueError("SMTP email settings are not configured")

    message = EmailMessage()

    message["Subject"] = "LabGuard Login OTP"
    message["From"] = smtp_email
    message["To"] = receiver_email

    message.set_content(
        f"""Hello,

Your LabGuard login verification code is:

{otp}

This OTP is required to complete your Super Admin login.

If you did not attempt to log in, please ignore this email.

Regards,
LabGuard System
"""
    )

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.send_message(message)