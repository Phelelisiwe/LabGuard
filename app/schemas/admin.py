from pydantic import BaseModel, EmailStr


class SuperAdminCreate(BaseModel):
    email: EmailStr
    password: str
    developer_key: str