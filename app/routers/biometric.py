from datetime import datetime

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
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)

from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    AuthenticatorAttachment,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)


router = APIRouter(
    prefix="/biometric",
    tags=["Biometric Registration"],
)


# =========================================================
# WEBAUTHN CONFIGURATION
# =========================================================

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
    "https://labguard-1-pwhe.onrender.com"
)


# =========================================================
# TEMPORARY CHALLENGE STORAGE
# =========================================================

registration_challenges = {}

authentication_challenges = {}


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
            biometric.fingerprint_credential_id
            is not None
        ),
        "biometric_complete": (
            biometric.face_embedding is not None
            and biometric.fingerprint_credential_id
            is not None
        ),
        "status": biometric.biometric_status,
    }


# =========================================================
# FINGERPRINT REGISTRATION OPTIONS
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

    if not biometric or not biometric.face_embedding:

        raise HTTPException(
            status_code=400,
            detail=(
                "Face registration must be completed "
                "before fingerprint registration."
            ),
        )

    if biometric.fingerprint_credential_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint is already registered "
                "for this student."
            ),
        )

    # Generate a unique WebAuthn user ID
    user_id = secrets.token_bytes(32)

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

    registration_challenges[student_id] = (
        options.challenge
    )

    return options_to_json(options)


# =========================================================
# VERIFY FINGERPRINT REGISTRATION
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

    expected_challenge = (
        registration_challenges.get(student_id)
    )

    if not expected_challenge:

        raise HTTPException(
            status_code=400,
            detail=(
                "No active fingerprint registration "
                "request was found. Please start "
                "registration again."
            ),
        )

    credential = data.model_dump(
        by_alias=True
    )

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
            "WebAuthn registration verification failed:",
            repr(exc)
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint registration could not "
                "be verified by the server."
            ),
        )

    # =====================================================
    # ENCODE CREDENTIAL ID
    # =====================================================

    credential_id = (
        base64.urlsafe_b64encode(
            verification.credential_id
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    # =====================================================
    # ENCODE PUBLIC KEY
    # =====================================================

    public_key = (
        base64.urlsafe_b64encode(
            verification.credential_public_key
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    # =====================================================
    # SAVE FINGERPRINT CREDENTIAL
    # =====================================================

    biometric.fingerprint_credential_id = (
        credential_id
    )

    biometric.fingerprint_public_key = (
        public_key
    )

    biometric.fingerprint_sign_count = (
        verification.sign_count
    )

    # Face + fingerprint are now registered
    biometric.biometric_status = "complete"

    db.commit()
    db.refresh(biometric)

    # Challenge can only be used once
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

@router.get(
    "/students/{student_id}"
)
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
        and biometric.fingerprint_credential_id
        is not None
        and biometric.fingerprint_credential_id != ""
    )

    biometric_complete = (
        face_registered
        and fingerprint_registered
    )

    if biometric_complete:

        status = "Registered"

    elif face_registered:

        status = "Fingerprint Required"

    else:

        status = "Face Required"

    return {
        "student_id": student_id,
        "face_registered": face_registered,
        "fingerprint_registered": fingerprint_registered,
        "biometric_complete": biometric_complete,
        "status": status,
    }


# =========================================================
# FINGERPRINT ATTENDANCE - OPTIONS
# =========================================================

@router.get(
    "/attendance/fingerprint/options"
)
def generate_fingerprint_attendance_options(
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    student_id = current_user["user_id"]

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric:

        raise HTTPException(
            status_code=400,
            detail="No biometric registration found."
        )

    if not biometric.fingerprint_credential_id:

        raise HTTPException(
            status_code=400,
            detail="Fingerprint is not registered."
        )

    if not biometric.fingerprint_public_key:

        raise HTTPException(
            status_code=400,
            detail="Fingerprint public key is missing."
        )

    # =====================================================
    # DECODE STORED CREDENTIAL ID
    # =====================================================

    try:

        credential_id = base64.urlsafe_b64decode(
            biometric.fingerprint_credential_id
            + "=" * (
                4 - len(
                    biometric.fingerprint_credential_id
                ) % 4
            ) % 4
        )

    except Exception:

        raise HTTPException(
            status_code=500,
            detail=(
                "Stored fingerprint credential is invalid."
            )
        )

    # =====================================================
    # GENERATE AUTHENTICATION OPTIONS
    # =====================================================

    challenge = secrets.token_bytes(32)

    options = generate_authentication_options(
        rp_id=RP_ID,
        challenge=challenge,
        allow_credentials=[
            PublicKeyCredentialDescriptor(
                id=credential_id
            )
        ],
        user_verification=(
            UserVerificationRequirement.REQUIRED
        ),
    )

    authentication_challenges[student_id] = (
        options.challenge
    )

    return options_to_json(options)


# =========================================================
# FINGERPRINT ATTENDANCE - VERIFY + CHECK-IN
# =========================================================

@router.post(
    "/attendance/fingerprint/verify"
)
def verify_fingerprint_attendance(
    module_id: int,
    credential: dict,
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    # Import attendance models here to avoid
    # unnecessary model import issues at startup.
    from app.models.attendance import (
        Attendance,
        Module,
        StudentModule,
    )

    student_id = current_user["user_id"]

    # =====================================================
    # CHECK STUDENT
    # =====================================================

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )

    # =====================================================
    # CHECK MODULE
    # =====================================================

    module = db.query(Module).filter(
        Module.id == module_id
    ).first()

    if not module:

        raise HTTPException(
            status_code=404,
            detail="Module not found."
        )

    # =====================================================
    # CHECK STUDENT IS REGISTERED FOR MODULE
    # =====================================================

    registration = db.query(
        StudentModule
    ).filter(
        StudentModule.student_id == student_id,
        StudentModule.module_id == module_id
    ).first()

    if not registration:

        raise HTTPException(
            status_code=403,
            detail=(
                "You are not registered for this module."
            )
        )

    # =====================================================
    # CHECK DUPLICATE ATTENDANCE
    # =====================================================

    today = datetime.now().date()

    existing_attendance = db.query(
        Attendance
    ).filter(
        Attendance.student_id == student_id,
        Attendance.module_id == module_id,
        Attendance.date == today
    ).first()

    if existing_attendance:

        raise HTTPException(
            status_code=400,
            detail=(
                "You have already checked in "
                "for this module today."
            )
        )

    # =====================================================
    # GET BIOMETRIC RECORD
    # =====================================================

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric:

        raise HTTPException(
            status_code=400,
            detail="No biometric registration found."
        )

    if not biometric.fingerprint_credential_id:

        raise HTTPException(
            status_code=400,
            detail="Fingerprint is not registered."
        )

    if not biometric.fingerprint_public_key:

        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint public key is missing."
            )
        )

    # =====================================================
    # GET ACTIVE AUTHENTICATION CHALLENGE
    # =====================================================

    expected_challenge = (
        authentication_challenges.get(student_id)
    )

    if not expected_challenge:

        raise HTTPException(
            status_code=400,
            detail=(
                "No active fingerprint authentication "
                "request was found. Please try again."
            )
        )

    # =====================================================
    # DECODE STORED CREDENTIAL ID AND PUBLIC KEY
    # =====================================================

    try:

        credential_id = base64.urlsafe_b64decode(
            biometric.fingerprint_credential_id
            + "=" * (
                4 - len(
                    biometric.fingerprint_credential_id
                ) % 4
            ) % 4
        )

        public_key = base64.urlsafe_b64decode(
            biometric.fingerprint_public_key
            + "=" * (
                4 - len(
                    biometric.fingerprint_public_key
                ) % 4
            ) % 4
        )

    except Exception:

        raise HTTPException(
            status_code=500,
            detail=(
                "Stored fingerprint credential is invalid."
            )
        )

    # =====================================================
    # VERIFY WEBAUTHN AUTHENTICATION
    # =====================================================

    try:

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=RP_ID,
            expected_origin=EXPECTED_ORIGIN,
            credential_public_key=public_key,
            credential_current_sign_count=(
                biometric.fingerprint_sign_count
            ),
            require_user_verification=True,
        )

    except Exception as exc:

        print(
            "Fingerprint authentication failed:",
            repr(exc)
        )

        raise HTTPException(
            status_code=401,
            detail="Fingerprint verification failed."
        )

    # =====================================================
    # VERIFY CREDENTIAL MATCH
    # =====================================================

    if verification.credential_id != credential_id:

        raise HTTPException(
            status_code=401,
            detail=(
                "Fingerprint credential does not match."
            )
        )

    # =====================================================
    # VERIFY USER VERIFICATION
    # =====================================================

    if not verification.user_verified:

        raise HTTPException(
            status_code=401,
            detail=(
                "Fingerprint verification was not completed."
            )
        )

    # =====================================================
    # UPDATE SIGN COUNT
    # =====================================================

    biometric.fingerprint_sign_count = (
        verification.new_sign_count
    )

    # =====================================================
    # CREATE ATTENDANCE
    # =====================================================

    new_attendance = Attendance(
        student_id=student_id,
        module_id=module_id,
        date=today,
        time_in=datetime.now()
    )

    db.add(new_attendance)

    db.commit()

    db.refresh(new_attendance)

    # =====================================================
    # REMOVE USED CHALLENGE
    # =====================================================

    authentication_challenges.pop(
        student_id,
        None
    )

    # =====================================================
    # SUCCESS RESPONSE
    # =====================================================

    return {
        "success": True,
        "verified": True,
        "message": (
            "Fingerprint verified and attendance "
            "recorded successfully."
        ),
        "student_id": student_id,
        "module_id": module_id,
        "attendance_id": new_attendance.id,
        "date": str(new_attendance.date),
        "time_in": str(new_attendance.time_in),
    }