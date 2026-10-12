from sqlalchemy import (
    Column,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    String
)
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

    # Either student_id OR employee_id is used.
    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=True,
        unique=True
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=True,
        unique=True
    )

    face_embedding = Column(
        Text,
        nullable=True
    )

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

    biometric_status = Column(
        String(30),
        nullable=False,
        default="incomplete"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )

    student = relationship(
        "Student",
        back_populates="biometric"
    )

    employee = relationship(
        "Employee",
        back_populates="biometric"
    )

    @property
    def has_face(self):
        return bool(self.face_embedding)

    @property
    def has_fingerprint(self):
        return bool(self.fingerprint_credential_id)

    @property
    def is_ready(self):
        return (
            self.has_face
            or self.has_fingerprint
        )