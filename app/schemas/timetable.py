from datetime import time
from typing import Optional

from pydantic import BaseModel


class TimetableCreate(BaseModel):
    module_id: int
    day_of_week: str
    start_time: time
    end_time: time
    laboratory: str
    lecturer_id: Optional[int] = None


class TimetableResponse(BaseModel):
    id: int
    lecturer_id: Optional[int]
    module_id: int
    day_of_week: str
    start_time: time
    end_time: time
    laboratory: str
    active: bool

    class Config:
        from_attributes = True