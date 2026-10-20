
from pydantic import BaseModel, EmailStr, Field


class StudentCreate(BaseModel):
    student_number: str = Field(min_length=1)
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    course: str = Field(min_length=1)
    current_year: int = Field(ge=1)
    email: EmailStr
