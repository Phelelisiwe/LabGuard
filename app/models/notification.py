from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

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
