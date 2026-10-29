from typing import Literal

from pydantic import BaseModel, Field


class ClassNotificationCreate(BaseModel):
    type: Literal["cancelled", "late"]
    title: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=5000)
