from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class OTP(Base):
    __tablename__ = "login_otps"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, nullable=False, index=True)

    otp_hash = Column(String, nullable=False)

    expires_at = Column(DateTime, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
    