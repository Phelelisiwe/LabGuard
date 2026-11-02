from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import base64

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
)

from app.database import get_db
from app.dependencies import require_role
from app.models.biometric import StudentBiometric
from app.schemas.biometric import FPM10AEnrollRequest

router = APIRouter(tags=["Biometrics"])

# Temporary cache for challenges (Use Redis in production)
CHALLENGE_STORE = {}

# =========================================================
# PHONE WEBAUTHN (Backup Attendance)
# =========================================================

@router.get("/webauthn/generate-registration-options")
def get_registration_options(
    current_user=Depends(require_role("student")), 
    db: Session = Depends(get_db)
):
    user_id = str(current_user["user_id"])
    
    options = generate_registration_options(
        rp_id="labguard-1-pwhe.onrender.com", 
        rp_name="LabGuard",
        user_id=user_id.encode(),
        user_name=current_user.get("email", "student@labguard.com"),
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.PREFERRED,
            resident_key=ResidentKeyRequirement.PREFERRED,
        )
    )

    CHALLENGE_STORE[user_id] = options.challenge
    return options_to_json(options)

@router.post("/webauthn/verify-registration")
def verify_registration(
    request_data: dict,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    user_id = str(current_user["user_id"])
    expected_challenge = CHALLENGE_STORE.get(user_id)
    
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="Session expired. Try again.")

    try:
        verification = verify_registration_response(
            credential=request_data,
            expected_challenge=expected_challenge,
            expected_origin=["https://labguard-1-pwhe.onrender.com", "http://localhost:5173"],
            expected_rp_id="labguard-1-pwhe.onrender.com",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not verification.verified:
        raise HTTPException(status_code=400, detail="Fingerprint verification failed.")

    # Save to your exact StudentBiometric model
    biometric = db.query(StudentBiometric).filter(StudentBiometric.student_id == current_user["user_id"]).first()
    if not biometric:
        biometric = StudentBiometric(student_id=current_user["user_id"])
        db.add(biometric)

    biometric.fingerprint_credential_id = base64.b64encode(verification.credential_id).decode()
    biometric.fingerprint_public_key = base64.b64encode(verification.credential_public_key).decode()
    biometric.fingerprint_sign_count = verification.sign_count
    biometric.biometric_status = "active"
    
    db.commit()
    del CHALLENGE_STORE[user_id]

    return {"success": True, "message": "Phone Fingerprint successfully registered!"}


# =========================================================
# FPM10A HARDWARE (Admin Registration)
# =========================================================

@router.post("/admin/register-fpm10a")
def start_fpm10a_enrollment(
    data: FPM10AEnrollRequest,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):
    if data.user_type == "student":
        biometric = db.query(StudentBiometric).filter(StudentBiometric.student_id == data.user_id).first()
        if not biometric:
            biometric = StudentBiometric(student_id=data.user_id)
            db.add(biometric)
    else:
        biometric = db.query(StudentBiometric).filter(StudentBiometric.employee_id == data.user_id).first()
        if not biometric:
            biometric = StudentBiometric(employee_id=data.user_id)
            db.add(biometric)
    
    biometric.fingerprint_enrollment_pending = True
    db.commit()
    
    return {"success": True, "message": "Hardware set to waiting mode."}

@router.post("/admin/cancel-fpm10a")
def cancel_fpm10a_enrollment(
    data: FPM10AEnrollRequest,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):
    if data.user_type == "student":
        biometric = db.query(StudentBiometric).filter(StudentBiometric.student_id == data.user_id).first()
    else:
        biometric = db.query(StudentBiometric).filter(StudentBiometric.employee_id == data.user_id).first()
        
    if biometric:
        biometric.fingerprint_enrollment_pending = False
        db.commit()
        
    return {"success": True, "message": "Enrollment cancelled."}

@router.get("/admin/check-pending/{user_id}")
def check_pending_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    # Called by the ESP32/Python Bridge to see if Admin clicked cancel
    biometric = db.query(StudentBiometric).filter(StudentBiometric.student_id == user_id).first()
    is_pending = biometric.fingerprint_enrollment_pending if biometric else False
    return {"pending": is_pending}

@router.post("/admin/link-fpm10a-slot")
def link_sensor_slot(
    data: dict,
    db: Session = Depends(get_db)
):
    # Called by the ESP32/Python Bridge after successful scan
    user_id = data.get("user_id")
    slot = data.get("fingerprint_sensor_slot")
    
    biometric = db.query(StudentBiometric).filter(StudentBiometric.student_id == user_id).first()
    if not biometric:
        raise HTTPException(status_code=404, detail="Biometric profile not found")
        
    biometric.fingerprint_sensor_slot = slot
    biometric.fingerprint_enrollment_pending = False
    biometric.biometric_status = "active"
    db.commit()
    
    return {"success": True, "message": f"Fingerprint linked to slot {slot}"}
