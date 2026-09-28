from datetime import date, datetime, time
from pydantic import BaseModel


class AttendanceCheckIn(BaseModel):
    student_id: int
    module_id: int


class AttendanceCheckOut(BaseModel):
    student_id: int
    module_id: int


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    module_id: int
    date: date
    time_in: datetime
    time_out: time | None

    class Config:
        from_attributes = True