from typing import Any, Dict
from pydantic import BaseModel, Field


# =========================================================
# WEBAUTHN REGISTRATION RESPONSE (Phone Backup)
# =========================================================
class FingerprintRegistration(BaseModel):
    id: str
    rawId: str
    response: Dict[str, Any]
    type: str = "public-key"
    clientExtensionResults: Dict[str, Any] = Field(default_factory=dict)
    authenticatorAttachment: str | None = None


# =========================================================
# FPM10A HARDWARE ENROLLMENT (Lab Sensor)
# =========================================================
class FPM10AEnrollRequest(BaseModel):
    user_id: int
    user_type: str = "student" # 'student' or 'employee'


# =========================================================
# BIOMETRIC RESPONSE
# =========================================================
class BiometricResponse(BaseModel):
    id: int
    student_id: int | None = None
    employee_id: int | None = None

    fingerprint_sensor_slot: int | None = None
    fingerprint_enrollment_pending: bool
    fingerprint_revocation_pending: bool

    fingerprint_registered: bool # True if fingerprint_credential_id exists
    fingerprint_sign_count: int

    biometric_status: str
    is_ready: bool

    class Config:
        from_attributes = True
