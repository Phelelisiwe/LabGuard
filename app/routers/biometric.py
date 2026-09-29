
import base64
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student
from app.models.biometric import StudentBiometric
from app.schemas.biometric import (
    FaceRegistration,
    FingerprintRegistration,
)
from app.dependencies import require_role

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    options_to_json,
)

from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    AuthenticatorAttachment,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)


router = APIRouter(
    prefix="/biometric",
    tags=["Biometric Registration"],
)


# =========================================================
# WEBAUTHN CONFIGURATION
# =========================================================

# For local desktop testing:
RP_ID = os.getenv(
    "WEBAUTHN_RP_ID",
    "localhost"
)

RP_NAME = os.getenv(
    "WEBAUTHN_RP_NAME",
    "LabGuard"
)

EXPECTED_ORIGIN = os.getenv(
    "WEBAUTHN_ORIGIN",
    "http://localhost:5173"
)


# =========================================================
# TEMPORARY REGISTRATION CHALLENGE STORAGE
# =========================================================
#
# This is okay for local testing.
#
# Before deployment we should move challenges into the
# database or Redis so that multiple backend workers can
# safely share them.
#
# student_id -> challenge bytes
#
# =========================================================

registration_challenges = {}


# =========================================================
# REGISTER FACE
# =========================================================

@router.post("/students/{student_id}/face")
def register_face(
    student_id: int,
    data: FaceRegistration,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db),
):

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric:
        biometric = StudentBiometric(
            student_id=student_id
        )

        db.add(biometric)
        db.flush()

    biometric.face_embedding = data.face_embedding

    if biometric.fingerprint_credential_id:
        biometric.biometric_status = "complete"
    else:
        biometric.biometric_status = "face_registered"

    db.commit()
    db.refresh(biometric)

    return {
        "success": True,
        "message": "Face registered successfully",
        "student_id": student_id,
        "face_registered": True,
        "fingerprint_registered": (
            biometric.fingerprint_credential_id is not None
        ),
        "biometric_complete": (
            biometric.face_embedding is not None
            and biometric.fingerprint_credential_id is not None
        ),
        "status": biometric.biometric_status,
    }


# =========================================================
# GENERATE WEBAUTHN REGISTRATION OPTIONS
# =========================================================

@router.get(
    "/students/{student_id}/fingerprint/options"
)
def generate_fingerprint_registration_options(
    student_id: int,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db),
):

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    # -----------------------------------------------------
    # FACE MUST EXIST FIRST
    # -----------------------------------------------------

    if not biometric or not biometric.face_embedding:
        raise HTTPException(
            status_code=400,
            detail=(
                "Face registration must be completed "
                "before fingerprint registration."
            ),
        )

    # -----------------------------------------------------
    # DO NOT REGISTER THE SAME CREDENTIAL TWICE
    # -----------------------------------------------------

    if biometric.fingerprint_credential_id:
        raise HTTPException(
            status_code=400,
            detail="Fingerprint is already registered for this student.",
        )

    # -----------------------------------------------------
    # CREATE A RANDOM USER ID
    # -----------------------------------------------------

    user_id = secrets.token_bytes(32)

    # -----------------------------------------------------
    # GENERATE REGISTRATION OPTIONS
    # -----------------------------------------------------

    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,

        user_id=user_id,

        user_name=(
            student.email
            or f"student-{student.student_number}"
        ),

        user_display_name=(
            f"{student.first_name} "
            f"{student.last_name}"
        ),

        authenticator_selection=(
            AuthenticatorSelectionCriteria(
                authenticator_attachment=(
                    AuthenticatorAttachment.PLATFORM
                ),
                resident_key=(
                    ResidentKeyRequirement.PREFERRED
                ),
                user_verification=(
                    UserVerificationRequirement.REQUIRED
                ),
            )
        ),
    )

    # -----------------------------------------------------
    # SAVE CHALLENGE
    # -----------------------------------------------------

    registration_challenges[student_id] = (
        options.challenge
    )

    return options_to_json(options)


# =========================================================
# VERIFY WEBAUTHN REGISTRATION
# =========================================================

@router.post(
    "/students/{student_id}/fingerprint/verify"
)
def verify_fingerprint_registration(
    student_id: int,
    data: FingerprintRegistration,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db),
):

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric or not biometric.face_embedding:
        raise HTTPException(
            status_code=400,
            detail=(
                "Face registration must be completed "
                "before fingerprint registration."
            ),
        )

    # -----------------------------------------------------
    # GET SAVED CHALLENGE
    # -----------------------------------------------------

    expected_challenge = (
        registration_challenges.get(student_id)
    )

    if not expected_challenge:
        raise HTTPException(
            status_code=400,
            detail=(
                "No active fingerprint registration "
                "request was found. Please start registration again."
            ),
        )

    # -----------------------------------------------------
    # CONVERT PYDANTIC DATA TO DICT
    # -----------------------------------------------------

    credential = data.model_dump(
        by_alias=True
    )

    # -----------------------------------------------------
    # VERIFY THE WEBAUTHN RESPONSE
    # -----------------------------------------------------

    try:

        verification = verify_registration_response(
            credential=credential,

            expected_challenge=expected_challenge,

            expected_rp_id=RP_ID,

            expected_origin=EXPECTED_ORIGIN,

            require_user_verification=True,
        )

    except Exception as exc:

        print(
            "WebAuthn verification failed:",
            repr(exc)
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint registration could not "
                "be verified by the server."
            ),
        )

    # -----------------------------------------------------
    # CONVERT CREDENTIAL DATA TO BASE64URL
    # -----------------------------------------------------

    credential_id = (
        base64.urlsafe_b64encode(
            verification.credential_id
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    public_key = (
        base64.urlsafe_b64encode(
            verification.credential_public_key
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    # -----------------------------------------------------
    # SAVE VERIFIED CREDENTIAL
    # -----------------------------------------------------

    biometric.fingerprint_credential_id = (
        credential_id
    )

    biometric.fingerprint_public_key = (
        public_key
    )

    biometric.biometric_status = "complete"

    db.commit()
    db.refresh(biometric)

    # -----------------------------------------------------
    # REMOVE USED CHALLENGE
    # -----------------------------------------------------

    registration_challenges.pop(
        student_id,
        None
    )

    return {
        "success": True,
        "verified": True,
        "message": (
            "Phone biometric registered successfully."
        ),
        "student_id": student_id,
        "face_registered": True,
        "fingerprint_registered": True,
        "biometric_complete": True,
        "status": "complete",
    }


# =========================================================
# CHECK BIOMETRIC REGISTRATION STATUS
# =========================================================

@router.get("/students/{student_id}")
def get_biometric_status(
    student_id: int,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db),
):

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    face_registered = (
        biometric is not None
        and biometric.face_embedding is not None
        and biometric.face_embedding != ""
    )

    fingerprint_registered = (
        biometric is not None
        and biometric.fingerprint_credential_id is not None
        and biometric.fingerprint_credential_id != ""
    )

    complete = (
        face_registered
        and fingerprint_registered
    )

    if complete:
        status = "Registered"

    elif face_registered:
        status = "Fingerprint Required"

    else:
        status = "Face Required"

    return {
        "student_id": student_id,
        "face_registered": face_registered,
        "fingerprint_registered": fingerprint_registered,
        "biometric_complete": complete,
        "status": status,
    }

