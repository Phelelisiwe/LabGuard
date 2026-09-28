
from pydantic import BaseModel, Field


# =========================================================
# FACE REGISTRATION
# =========================================================

class FaceRegistration(BaseModel):
    face_embedding: str = Field(
        min_length=1,
        description="Face embedding generated from the student's face"
    )


# =========================================================
# FINGERPRINT / PHONE BIOMETRIC REGISTRATION
# =========================================================

class FingerprintRegistration(BaseModel):
    credential_id: str = Field(
        min_length=1,
        description="WebAuthn credential ID created by the student's phone"
    )

    public_key: str = Field(
        min_length=1,
        description="WebAuthn public key associated with the phone credential"
    )


# =========================================================
# BIOMETRIC RESPONSE
# =========================================================

class BiometricResponse(BaseModel):
    id: int
    student_id: int

    face_registered: bool
    fingerprint_registered: bool

    biometric_complete: bool
    status: str

    class Config:
        from_attributes = True

