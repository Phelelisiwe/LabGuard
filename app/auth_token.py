import os
from datetime import datetime, timedelta, timezone

from jose import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")

if not SECRET_KEY:
    raise ValueError("JWT_SECRET is not configured")

ALGORITHM = "HS256"


def create_access_token(
    email: str,
    role: str,
    user_id: int
):
    expires = datetime.now(timezone.utc) + timedelta(hours=2)

    payload = {
        "sub": email,
        "user_id": user_id,
        "role": role,
        "exp": expires
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )