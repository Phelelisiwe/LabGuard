from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)

from app.database import Base


class ClassNotification(Base):
    __tablename__ = "class_notifications"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("modules.id"),
        nullable=False,
        index=True,
    )
    lecturer_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
    )
    type = Column(String(20), nullable=False)
    title = Column(String(160), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.now)


class StudentNotificationRead(Base):
    """
    Tracks which students have read which notifications.

    A student is "unread" for a notification until a row exists here
    for (student_id, notification_id).
    """

    __tablename__ = "student_notification_reads"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    notification_id = Column(
        Integer,
        ForeignKey("class_notifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    read_at = Column(
        DateTime,
        nullable=False,
        default=datetime.now,
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "notification_id",
            name="uq_student_notification_read",
        ),
    )
