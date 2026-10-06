from datetime import datetime
import base64
import json
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
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
    "localhost",
)

RP_NAME = os.getenv(
    "WEBAUTHN_RP_NAME",
    "LabGuard",
)

EXPECTED_ORIGIN = os.getenv(
    "WEBAUTHN_ORIGIN",
    "https://labguard-1-pwhe.onrender.com",
)


# =========================================================
# TEMPORARY CHALLENGE STORAGE
# =========================================================

registration_challenges = {}
authentication_challenges = {}


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def options_json_response(options):
    """
    Convert py_webauthn options into a real JSON object.
    """

    try:
        options_json = options_to_json(options)

        if isinstance(options_json, str):
            options_data = json.loads(options_json)
        else:
            options_data = options_json

        if not isinstance(options_data, dict):
            raise ValueError(
                "WebAuthn options did not produce a JSON object."
            )

        return JSONResponse(
            content=options_data
        )

    except Exception as exc:
        print(
            "Failed to serialize WebAuthn options:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The server could not generate valid "
                "WebAuthn options."
            ),
        )


def decode_base64url(value: str, field_name: str) -> bytes:
    """
    Decode a stored Base64URL value.
    """

    try:
        padding = "=" * (
            (4 - len(value) % 4) % 4
        )

        return base64.urlsafe_b64decode(
            value + padding
        )

    except Exception as exc:
        print(
            f"Failed to decode {field_name}:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Stored {field_name} is invalid."
            ),
        )


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
            detail="Student not found.",
        )

    biometric = db.query(
        StudentBiometric
    ).filter(
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
        "message": "Face registered successfully.",
        "student_id": student_id,
        "face_registered": True,
        "fingerprint_registered": (
            biometric.fingerprint_credential_id
            is not None
        ),
        "biometric_complete": (
            biometric.face_embedding is not None
            and biometric.fingerprint_credential_id is not None
        ),
        "status": biometric.biometric_status,
    }


# =========================================================
# FINGERPRINT REGISTRATION - OPTIONS
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

    # -----------------------------------------------------
    # FIND STUDENT
    # -----------------------------------------------------

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found.",
        )

    # -----------------------------------------------------
    # FIND BIOMETRIC RECORD
    # -----------------------------------------------------

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please register the student's face "
                "before registering the fingerprint."
            ),
        )

    if not biometric.face_embedding:
        raise HTTPException(
            status_code=400,
            detail=(
                "Face registration must be completed "
                "before fingerprint registration."
            ),
        )

    # -----------------------------------------------------
    # PREVENT DUPLICATE FINGERPRINT
    # -----------------------------------------------------

    if biometric.fingerprint_credential_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint is already registered "
                "for this student."
            ),
        )

    # -----------------------------------------------------
    # GENERATE USER ID
    # -----------------------------------------------------

    user_id = secrets.token_bytes(32)

    # -----------------------------------------------------
    # GENERATE WEBAUTHN REGISTRATION OPTIONS
    # -----------------------------------------------------

    try:

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

    except Exception as exc:

        print(
            "WebAuthn registration options generation failed:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The server could not create the "
                "fingerprint registration request."
            ),
        )

    # -----------------------------------------------------
    # SAVE CHALLENGE
    # -----------------------------------------------------

    registration_challenges[student_id] = (
        options.challenge
    )

    print(
        "Fingerprint registration challenge created "
        f"for student {student_id}"
    )

    print(
        "WebAuthn RP ID:",
        RP_ID
    )

    print(
        "WebAuthn origin:",
        EXPECTED_ORIGIN
    )

    # -----------------------------------------------------
    # RETURN REAL JSON OBJECT
    # -----------------------------------------------------

    return options_json_response(options)


# =========================================================
# FINGERPRINT REGISTRATION - VERIFY
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

    # -----------------------------------------------------
    # FIND STUDENT
    # -----------------------------------------------------

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found.",
        )

    # -----------------------------------------------------
    # FIND BIOMETRIC RECORD
    # -----------------------------------------------------

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric:
        raise HTTPException(
            status_code=400,
            detail="Biometric registration not found.",
        )

    if not biometric.face_embedding:
        raise HTTPException(
            status_code=400,
            detail=(
                "Face registration must be completed "
                "before fingerprint registration."
            ),
        )

    # -----------------------------------------------------
    # GET EXPECTED CHALLENGE
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # CONVERT FRONTEND RESPONSE
    # -----------------------------------------------------

    credential = data.model_dump(
        by_alias=True
    )

    print(
        "Received WebAuthn registration response "
        f"for student {student_id}"
    )

    # -----------------------------------------------------
    # VERIFY WEBAUTHN REGISTRATION
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

    # -----------------------------------------------------
    # ENCODE CREDENTIAL ID
    # -----------------------------------------------------

    credential_id = (
        base64.urlsafe_b64encode(
            verification.credential_id
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    # -----------------------------------------------------
    # ENCODE PUBLIC KEY
    # -----------------------------------------------------

    public_key = (
        base64.urlsafe_b64encode(
            verification.credential_public_key
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    # -----------------------------------------------------
    # SAVE FINGERPRINT CREDENTIAL
    # -----------------------------------------------------

    biometric.fingerprint_credential_id = (
        credential_id
    )

    biometric.fingerprint_public_key = (
        public_key
    )

    biometric.fingerprint_sign_count = (
        verification.sign_count
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

    # -----------------------------------------------------
    # SUCCESS
    # -----------------------------------------------------

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
            detail="Student not found.",
        )

    biometric = db.query(
        StudentBiometric
    ).filter(
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

    # -----------------------------------------------------
    # FIND BIOMETRIC RECORD
    # -----------------------------------------------------

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric:
        raise HTTPException(
            status_code=400,
            detail="No biometric registration found.",
        )

    if not biometric.fingerprint_credential_id:
        raise HTTPException(
            status_code=400,
            detail="Fingerprint is not registered.",
        )

    if not biometric.fingerprint_public_key:
        raise HTTPException(
            status_code=400,
            detail="Fingerprint public key is missing.",
        )

    # -----------------------------------------------------
    # DECODE STORED CREDENTIAL ID
    # -----------------------------------------------------

    credential_id = decode_base64url(
        biometric.fingerprint_credential_id,
        "fingerprint credential",
    )

    # -----------------------------------------------------
    # GENERATE AUTHENTICATION OPTIONS
    # -----------------------------------------------------

    challenge = secrets.token_bytes(32)

    try:

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

    except Exception as exc:

        print(
            "WebAuthn authentication options generation failed:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The server could not create the "
                "fingerprint authentication request."
            ),
        )

    # -----------------------------------------------------
    # SAVE CHALLENGE
    # -----------------------------------------------------

    authentication_challenges[student_id] = (
        options.challenge
    )

    print(
        "Fingerprint authentication challenge created "
        f"for student {student_id}"
    )

    # -----------------------------------------------------
    # RETURN REAL JSON OBJECT
    # -----------------------------------------------------

    return options_json_response(options)


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

    from app.models.attendance import (
        Attendance,
        Module,
        StudentModule,
    )

    student_id = current_user["user_id"]

    # -----------------------------------------------------
    # CHECK STUDENT
    # -----------------------------------------------------

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found.",
        )

    # -----------------------------------------------------
    # CHECK MODULE
    # -----------------------------------------------------

    module = db.query(Module).filter(
        Module.id == module_id
    ).first()

    if not module:
        raise HTTPException(
            status_code=404,
            detail="Module not found.",
        )

    # -----------------------------------------------------
    # CHECK MODULE REGISTRATION
    # -----------------------------------------------------

    registration = db.query(
        StudentModule
    ).filter(
        StudentModule.student_id == student_id,
        StudentModule.module_id == module_id,
    ).first()

    if not registration:
        raise HTTPException(
            status_code=403,
            detail=(
                "You are not registered for this module."
            ),
        )

    # -----------------------------------------------------
    # CHECK DUPLICATE ATTENDANCE
    # -----------------------------------------------------

    today = datetime.now().date()

    existing_attendance = db.query(
        Attendance
    ).filter(
        Attendance.student_id == student_id,
        Attendance.module_id == module_id,
        Attendance.date == today,
    ).first()

    if existing_attendance:
        raise HTTPException(
            status_code=400,
            detail=(
                "You have already checked in "
                "for this module today."
            ),
        )

    # -----------------------------------------------------
    # GET BIOMETRIC RECORD
    # -----------------------------------------------------

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric:
        raise HTTPException(
            status_code=400,
            detail="No biometric registration found.",
        )

    if not biometric.fingerprint_credential_id:
        raise HTTPException(
            status_code=400,
            detail="Fingerprint is not registered.",
        )

    if not biometric.fingerprint_public_key:
        raise HTTPException(
            status_code=400,
            detail="Fingerprint public key is missing.",
        )

    # -----------------------------------------------------
    # GET ACTIVE CHALLENGE
    # -----------------------------------------------------

    expected_challenge = (
        authentication_challenges.get(student_id)
    )

    if not expected_challenge:
        raise HTTPException(
            status_code=400,
            detail=(
                "No active fingerprint authentication "
                "request was found. Please try again."
            ),
        )

    # -----------------------------------------------------
    # DECODE CREDENTIAL ID
    # -----------------------------------------------------

    credential_id = decode_base64url(
        biometric.fingerprint_credential_id,
        "fingerprint credential",
    )

    # -----------------------------------------------------
    # DECODE PUBLIC KEY
    # -----------------------------------------------------

    public_key = decode_base64url(
        biometric.fingerprint_public_key,
        "fingerprint public key",
    )

    # -----------------------------------------------------
    # VERIFY WEBAUTHN AUTHENTICATION
    # -----------------------------------------------------

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
            detail="Fingerprint verification failed.",
        )

    # -----------------------------------------------------
    # VERIFY CREDENTIAL MATCH
    # -----------------------------------------------------

    if verification.credential_id != credential_id:
        raise HTTPException(
            status_code=401,
            detail=(
                "Fingerprint credential does not match."
            ),
        )

    # -----------------------------------------------------
    # VERIFY USER VERIFICATION
    # -----------------------------------------------------

    if not verification.user_verified:
        raise HTTPException(
            status_code=401,
            detail=(
                "Fingerprint verification was not completed."
            ),
        )

    # -----------------------------------------------------
    # UPDATE SIGN COUNT
    # -----------------------------------------------------

    biometric.fingerprint_sign_count = (
        verification.new_sign_count
    )

    # -----------------------------------------------------
    # CREATE ATTENDANCE
    # -----------------------------------------------------

    new_attendance = Attendance(
        student_id=student_id,
        module_id=module_id,
        date=today,
        time_in=datetime.now(),
    )

    db.add(new_attendance)

    db.commit()

    db.refresh(new_attendance)

    # -----------------------------------------------------
    # REMOVE USED CHALLENGE
    # -----------------------------------------------------

    authentication_challenges.pop(
        student_id,
        None
    )

    # -----------------------------------------------------
    # SUCCESS
    # -----------------------------------------------------

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


# =========================================================
# FACE ATTENDANCE - VERIFY + CHECK-IN
# =========================================================

@router.post(
    "/attendance/face/verify"
)
def verify_face_attendance(
    module_id: int,
    face_embedding: str,
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    from app.models.attendance import (
        Attendance,
        Module,
        StudentModule,
    )

    student_id = current_user["user_id"]

    # -----------------------------------------------------
    # CHECK STUDENT
    # -----------------------------------------------------

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found.",
        )

    # -----------------------------------------------------
    # CHECK MODULE
    # -----------------------------------------------------

    module = db.query(Module).filter(
        Module.id == module_id
    ).first()

    if not module:
        raise HTTPException(
            status_code=404,
            detail="Module not found.",
        )

    # -----------------------------------------------------
    # CHECK MODULE REGISTRATION
    # -----------------------------------------------------

    registration = db.query(
        StudentModule
    ).filter(
        StudentModule.student_id == student_id,
        StudentModule.module_id == module_id,
    ).first()

    if not registration:
        raise HTTPException(
            status_code=403,
            detail=(
                "You are not registered for this module."
            ),
        )

    # -----------------------------------------------------
    # CHECK DUPLICATE ATTENDANCE
    # -----------------------------------------------------

    today = datetime.now().date()

    existing_attendance = db.query(
        Attendance
    ).filter(
        Attendance.student_id == student_id,
        Attendance.module_id == module_id,
        Attendance.date == today,
    ).first()

    if existing_attendance:
        raise HTTPException(
            status_code=400,
            detail=(
                "You have already checked in "
                "for this module today."
            ),
        )

    # -----------------------------------------------------
    # GET REGISTERED FACE
    # -----------------------------------------------------

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric:
        raise HTTPException(
            status_code=400,
            detail="No biometric registration found.",
        )

    if not biometric.face_embedding:
        raise HTTPException(
            status_code=400,
            detail="Face is not registered.",
        )

    # -----------------------------------------------------
    # CONVERT EMBEDDINGS
    # -----------------------------------------------------

    try:

        registered_embedding = [
            float(value)
            for value in biometric.face_embedding.split(",")
        ]

        submitted_embedding = [
            float(value)
            for value in face_embedding.split(",")
        ]

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Invalid face embedding.",
        )

    # -----------------------------------------------------
    # CHECK EMBEDDING SIZE
    # -----------------------------------------------------

    if len(registered_embedding) != 128:
        raise HTTPException(
            status_code=500,
            detail="Stored face biometric is invalid.",
        )

    if len(submitted_embedding) != 128:
        raise HTTPException(
            status_code=400,
            detail="Invalid face biometric.",
        )

    # -----------------------------------------------------
    # CALCULATE EUCLIDEAN DISTANCE
    # -----------------------------------------------------

    distance = sum(
        (
            registered_embedding[i]
            - submitted_embedding[i]
        ) ** 2
        for i in range(128)
    ) ** 0.5

    # -----------------------------------------------------
    # FACE MATCHING THRESHOLD
    # -----------------------------------------------------

    FACE_THRESHOLD = 0.6

    # -----------------------------------------------------
    # TEMPORARY FACE VERIFICATION DEBUG
    # -----------------------------------------------------

    print("====================================")
    print("FACE VERIFICATION DEBUG")
    print(f"Student ID: {student_id}")
    print(f"Face distance: {distance:.4f}")
    print(f"Face threshold: {FACE_THRESHOLD}")
    print(f"Match: {distance <= FACE_THRESHOLD}")
    print("====================================")

    # -----------------------------------------------------
    # REJECT FACE IF DISTANCE IS TOO HIGH
    # -----------------------------------------------------

    if distance > FACE_THRESHOLD:

        raise HTTPException(
            status_code=401,
            detail=(
                "Face verification failed. "
                "The detected face does not match "
                "the registered student."
            ),
        )

    # -----------------------------------------------------
    # CREATE ATTENDANCE
    # -----------------------------------------------------

    new_attendance = Attendance(
        student_id=student_id,
        module_id=module_id,
        date=today,
        time_in=datetime.now(),
    )

    db.add(new_attendance)

    db.commit()

    db.refresh(new_attendance)

    # -----------------------------------------------------
    # SUCCESS
    # -----------------------------------------------------

    return {
        "success": True,
        "verified": True,
        "method": "face",
        "message": (
            "Face verified and attendance "
            "recorded successfully."
        ),
        "student_id": student_id,
        "module_id": module_id,
        "attendance_id": new_attendance.id,
        "date": str(new_attendance.date),
        "time_in": str(new_attendance.time_in),
        "face_distance": distance,
    }