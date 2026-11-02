from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import delete
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
from app.models.biometric import Biometric
from app.models.student import Student
from app.models.employee import Employee

router = APIRouter(prefix="/webauthn", tags=["Biometrics"])

# Temporary in-memory cache for challenges. (Use Redis in production)
CHALLENGE_STORE = {}

@router.get("/generate-registration-options")
def get_registration_options(
    current_user=Depends(require_role("student")), # Change to handle employees too if needed
    db: Session = Depends(get_db)
):
    user_id = str(current_user["user_id"])
    
    # 1. Generate the challenge (a random string)
    options = generate_registration_options(
        rp_id="labguard-1-pwhe.onrender.com",  # Your frontend domain
        rp_name="LabGuard",
        user_id=user_id.encode(),
        user_name=current_user.get("email", "user@labguard.com"),
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.PREFERRED,
            resident_key=ResidentKeyRequirement.PREFERRED,
        )
    )

    # 2. Save the challenge to verify in the next step
    CHALLENGE_STORE[user_id] = options.challenge

    return options_to_json(options)

@router.post("/verify-registration")
def verify_registration(
    request_data: dict,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db)
):
    user_id = str(current_user["user_id"])
    
    # 1. Retrieve the challenge
    expected_challenge = CHALLENGE_STORE.get(user_id)
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="Registration session expired. Please try again.")

    try:
        # 2. Verify the phone's response
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

    # 3. Save to Database
    biometric = db.query(Biometric).filter(Biometric.student_id == current_user["user_id"]).first()
    if not biometric:
        biometric = Biometric(student_id=current_user["user_id"])
        db.add(biometric)

    # Convert bytes to Base64 strings for database storage
    biometric.phone_credential_id = base64.b64encode(verification.credential_id).decode()
    biometric.phone_public_key = base64.b64encode(verification.credential_public_key).decode()
    biometric.fingerprint_sign_count = verification.sign_count
    biometric.biometric_status = "active"
    
    db.commit()

    # Clean up challenge
    del CHALLENGE_STORE[user_id]

    return {"success": True, "message": "Phone Fingerprint successfully registered!"}
