from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class EmployeeRole(str, Enum):
    SUPER_ADMIN = "Super Admin"
    LECTURER = "Lecturer"
    ASSISTANT_LECTURER = "Assistant Lecturer"
    CLEANER = "Cleaner"
    IT_SPECIALIST = "IT Specialist"


class EmployeeCreate(BaseModel):
    employee_number: str = Field(min_length=1)
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    email: EmailStr
    role: EmployeeRole
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)