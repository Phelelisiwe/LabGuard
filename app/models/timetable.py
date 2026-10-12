from sqlalchemy import (
    Column,
    Integer,
    String,
    Time,
    Boolean,
    ForeignKey
)

from sqlalchemy.orm import relationship

from app.database import Base


class Timetable(Base):

    __tablename__ = "timetable"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    lecturer_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=True
    )

    module_id = Column(
        Integer,
        ForeignKey("modules.id"),
        nullable=False
    )

    day_of_week = Column(
        String(20),
        nullable=False
    )

    start_time = Column(
        Time,
        nullable=False
    )

    end_time = Column(
        Time,
        nullable=False
    )

    laboratory = Column(
        String(100),
        nullable=False
    )

    active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    lecturer = relationship(
        "Employee",
        back_populates="timetable"
    )

    module = relationship(
        "Module",
        back_populates="timetable"
    )

    sessions = relationship(
        "AttendanceSession",
        back_populates="timetable"
    )