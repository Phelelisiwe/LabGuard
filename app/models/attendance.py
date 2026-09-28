from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)

    module_code = Column(
        String(20),
        unique=True,
        nullable=False
    )

    module_name = Column(
        String(100),
        nullable=False
    )

    # Level/year in which the module is offered
    level = Column(
        Integer,
        nullable=False
    )

    # Lecturer responsible for this module
    # Can be empty until the Super Admin assigns a lecturer
    lecturer_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=True
    )

    lecturer = relationship(
        "Employee",
        back_populates="modules"
    )

    student_modules = relationship(
        "StudentModule",
        back_populates="module",
        cascade="all, delete-orphan"
    )

    attendance = relationship(
        "Attendance",
        back_populates="module",
        cascade="all, delete-orphan"
    )


class StudentModule(Base):
    __tablename__ = "student_modules"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

    module_id = Column(
        Integer,
        ForeignKey("modules.id"),
        nullable=False
    )

    student = relationship(
        "Student",
        back_populates="student_modules"
    )

    module = relationship(
        "Module",
        back_populates="student_modules"
    )


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

    module_id = Column(
        Integer,
        ForeignKey("modules.id"),
        nullable=False
    )

    date = Column(
        Date,
        nullable=False
    )

    time_in = Column(
        DateTime,
        nullable=False
    )

    time_out = Column(
        Time,
        nullable=True
    )

    student = relationship(
        "Student",
        back_populates="attendance"
    )

    module = relationship(
        "Module",
        back_populates="attendance"
    )