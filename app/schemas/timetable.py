
from datetime import time
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TimetableCreate(BaseModel):
    module_id: int
    day_of_week: str
    start_time: time
    end_time: time
    laboratory: str
    lecturer_id: Optional[int] = None


class ModuleSummary(BaseModel):
    id: int
    module_code: str
    module_name: str
    level: int

    model_config = ConfigDict(from_attributes=True)


class TimetableResponse(BaseModel):
    id: int
    lecturer_id: Optional[int]
    module_id: int
    day_of_week: str
    start_time: time
    end_time: time
    laboratory: str
    active: bool
    module: ModuleSummary

    model_config = ConfigDict(from_attributes=True)
