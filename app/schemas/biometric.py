
from typing import Any, Dict

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
# WEBAUTHN REGISTRATION RESPONSE
# =========================================================

class FingerprintRegistration(BaseModel):
    """
    WebAuthn registration response returned by the student's
    phone/browser after successful biometric authentication.
    """

    id: str
    rawId: str

    response: Dict[str, Any]

    type: str = "public-key"

    clientExtensionResults: Dict[str, Any] = Field(
        default_factory=dict
    )

    authenticatorAttachment: str | None = None


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

