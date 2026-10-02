import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv

load_dotenv()


# =========================================================
# SEND EMAIL USING BREVO HTTPS API
# =========================================================

def _send_email(receiver_email: str, subject: str, text_content: str):

    api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("SMTP_SENDER")

    if not api_key or not sender_email:
        raise ValueError(
            "Brevo API settings are not configured. "
            "Set BREVO_API_KEY and SMTP_SENDER."
        )

    payload = {
        "sender": {
            "name": "LabGuard",
            "email": sender_email
        },
        "to": [
            {
                "email": receiver_email
            }
        ],
        "subject": subject,
        "textContent": text_content
    }

    request = Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        },
        method="POST"
    )

    try:
        with urlopen(request, timeout=20) as response:

            if response.status not in (200, 201):
                raise RuntimeError(
                    f"Brevo API returned HTTP {response.status}"
                )

    except HTTPError as error:

        detail = error.read().decode(
            "utf-8",
            errors="replace"
        )

        raise RuntimeError(
            f"Brevo API returned HTTP {error.code}: {detail}"
        ) from error

    except URLError as error:

        raise RuntimeError(
            f"Could not connect to Brevo API: {error.reason}"
        ) from error


# =========================================================
# SEND LOGIN OTP EMAIL
# =========================================================

def send_otp_email(receiver_email: str, otp: str):

    text_content = f"""Hello,

Your LabGuard login verification code is:

{otp}

This OTP is required to complete your LabGuard login.

If you did not attempt to log in, please ignore this email.

Regards,
LabGuard System
"""

    _send_email(
        receiver_email,
        "LabGuard Login OTP",
        text_content
    )


# =========================================================
# SEND PASSWORD RESET EMAIL
# =========================================================

def send_password_reset_email(
    receiver_email: str,
    reset_link: str
):

    text_content = f"""Hello,

A request was made to reset your LabGuard password.

Click the link below to create a new password:

{reset_link}

This password reset link will expire after 30 minutes.

If you did not request a password reset, please ignore this email.

Regards,
LabGuard System
"""

    _send_email(
        receiver_email,
        "LabGuard Password Reset",
        text_content
    )