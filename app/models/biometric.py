from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class StudentBiometric(Base):

    __tablename__ = "student_biometrics"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    # =====================================================
    # FACE BIOMETRIC
    # =====================================================

    face_embedding = Column(
        Text,
        nullable=True
    )

    # =====================================================
    # PHONE FINGERPRINT / WEBAUTHN
    # =====================================================

    fingerprint_credential_id = Column(
        String(500),
        nullable=True
    )

    fingerprint_public_key = Column(
        Text,
        nullable=True
    )

    fingerprint_sign_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    # =====================================================
    # REGISTRATION STATUS
    # =====================================================

    biometric_status = Column(
        String(30),
        nullable=False,
        default="incomplete"
    )

    # =====================================================
    # TIMESTAMPS
    # =====================================================

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )

    # =====================================================
    # RELATIONSHIP
    # =====================================================

    student = relationship(
        "Student",
        back_populates="biometric"
    )