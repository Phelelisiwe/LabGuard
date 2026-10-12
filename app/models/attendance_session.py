from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship

from app.database import Base


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # =====================================================
    # TIMETABLE
    # =====================================================

    timetable_id = Column(
        Integer,
        ForeignKey("timetable.id"),
        nullable=False
    )

    # =====================================================
    # LECTURER
    # =====================================================

    lecturer_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    # =====================================================
    # MODULE
    # =====================================================

    module_id = Column(
        Integer,
        ForeignKey("modules.id"),
        nullable=False
    )

    # =====================================================
    # LABORATORY
    # =====================================================

    laboratory = Column(
        String(100),
        nullable=False
    )

    # =====================================================
    # SESSION DATE / TIMES
    # =====================================================

    session_date = Column(
        Date,
        nullable=False
    )

    opened_at = Column(
        DateTime,
        nullable=False
    )

    closed_at = Column(
        DateTime,
        nullable=True
    )

    # =====================================================
    # STATUS
    #
    # active
    # closed
    # =====================================================

    status = Column(
        String(20),
        nullable=False,
        default="active"
    )

    # =====================================================
    # RELATIONSHIPS
    # =====================================================

    timetable = relationship(
        "Timetable",
        back_populates="sessions"
    )

    lecturer = relationship(
        "Employee",
        foreign_keys=[lecturer_id]
    )

    module = relationship(
        "Module",
        foreign_keys=[module_id]
    )