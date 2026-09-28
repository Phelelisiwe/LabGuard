from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_number = Column(String, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    course = Column(String, nullable=False)
    current_year = Column(Integer, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    email_verified = Column(Boolean, default=False)

    student_modules = relationship(
        "StudentModule",
        back_populates="student",
        cascade="all, delete-orphan"
    )

    attendance = relationship(
        "Attendance",
        back_populates="student",
        cascade="all, delete-orphan"
    )
    biometric = relationship(
    "StudentBiometric",
    back_populates="student",
    uselist=False,
    cascade="all, delete-orphan"
)