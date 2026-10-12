import os
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from dotenv import load_dotenv

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")

if not SECRET_KEY:
    raise ValueError("JWT_SECRET is not configured")

ALGORITHM = "HS256"

security = HTTPBearer()


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


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")
        user_id = payload.get("user_id")
        role = payload.get("role")

        if not email or not user_id or not role:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        return {
            "email": email,
            "user_id": user_id,
            "role": role
        }

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )