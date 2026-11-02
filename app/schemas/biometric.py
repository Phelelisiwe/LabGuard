from typing import Any, Dict
from pydantic import BaseModel, Field


# =========================================================
# WEBAUTHN REGISTRATION RESPONSE (Phone Backup)
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
    
    # Link to either a student or an employee
    student_id: int | None = None
    employee_id: int | None = None

    # Hardware FPM10A details
    fingerprint_sensor_slot: int | None = None
    fingerprint_enrollment_pending: bool
    fingerprint_revocation_pending: bool

    # Phone WebAuthn details
    fingerprint_registered: bool # True if phone_credential_id exists
    fingerprint_sign_count: int

    biometric_status: str
    biometric_complete: bool

    class Config:
        from_attributes = True
