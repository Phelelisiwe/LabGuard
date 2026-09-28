from pydantic import BaseModel, EmailStr


class VerifyOTPRequest(BaseModel):

    otp: str