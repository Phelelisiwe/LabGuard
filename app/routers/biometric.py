
from datetime import datetime
import base64
import json
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student
from app.models.employee import Employee
from app.models.biometric import StudentBiometric
from app.models.attendance import Attendance, StudentModule
from app.models.attendance_session import AttendanceSession
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

# Production configuration
PRODUCTION_RP_ID = os.getenv(
    "WEBAUTHN_RP_ID",
    "labguard-1-pwhe.onrender.com",
)

PRODUCTION_ORIGIN = os.getenv(
    "WEBAUTHN_ORIGIN",
    "https://labguard-1-pwhe.onrender.com",
)

RP_NAME = os.getenv(
    "WEBAUTHN_RP_NAME",
    "LabGuard",
)


# =========================================================
# TEMPORARY CHALLENGE STORAGE
# =========================================================
#
# IMPORTANT:
#
# We store:
#   challenge
#   rp_id
#   origin
#
# together.
#
# This allows:
#
# localhost:
#   http://localhost:5173
#   RP ID = localhost
#
# Render:
#   https://labguard-1-pwhe.onrender.com
#   RP ID = labguard-1-pwhe.onrender.com
#
# =========================================================

registration_challenges = {}
authentication_challenges = {}


# =========================================================
# WEBAUTHN CONFIG HELPER
# =========================================================

def get_webauthn_config(request: Request):
    """
    Determine the WebAuthn RP ID and origin from the
    browser origin.

    Local development:
        http://localhost:5173
        http://127.0.0.1:5173

    Production:
        https://labguard-1-pwhe.onrender.com
    """

    origin = request.headers.get("origin")

    if origin in [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]:
        return {
            "rp_id": "localhost",
            "origin": origin,
        }

    if origin == PRODUCTION_ORIGIN:
        return {
            "rp_id": PRODUCTION_RP_ID,
            "origin": PRODUCTION_ORIGIN,
        }

    # -----------------------------------------------------
    # Allow configured production origin when Origin header
    # is missing.
    #
    # This is useful for direct API testing through Swagger.
    # -----------------------------------------------------

    if not origin:
        return {
            "rp_id": PRODUCTION_RP_ID,
            "origin": PRODUCTION_ORIGIN,
        }

    raise HTTPException(
        status_code=400,
        detail=(
            "WebAuthn request came from an unauthorized "
            f"origin: {origin}"
        ),
    )


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def options_json_response(options):
    """
    Convert WebAuthn options to a real JSON object.
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


def decode_base64url(
    value: str,
    field_name: str,
) -> bytes:
    """
    Decode a Base64URL value.
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
            detail=f"Stored {field_name} is invalid.",
        )


def get_active_attendance_session(
    student_id: int,
    db: Session,
):
    """
    Find the active attendance session.

    Students never select the module.

    The active lecturer session determines
    the module automatically.
    """

    session = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.status == "active",
        AttendanceSession.session_date
        == datetime.now().date(),
    ).first()

    if not session:

        raise HTTPException(
            status_code=400,
            detail=(
                "There is currently no active "
                "attendance session."
            ),
        )

    # -----------------------------------------------------
    # CHECK STUDENT IS REGISTERED FOR THE MODULE
    # -----------------------------------------------------

    registration = db.query(
        StudentModule
    ).filter(
        StudentModule.student_id == student_id,
        StudentModule.module_id == session.module_id,
    ).first()

    if not registration:

        raise HTTPException(
            status_code=403,
            detail=(
                "You are not registered for the "
                "module currently being taught."
            ),
        )

    return session


def check_existing_session_attendance(
    student_id: int,
    session,
    db: Session,
):
    """
    Prevent a student from being marked present
    twice during the same active session.
    """

    existing = db.query(
        Attendance
    ).filter(
        Attendance.student_id == student_id,
        Attendance.module_id == session.module_id,
        Attendance.date == session.session_date,
    ).first()

    if existing:

        raise HTTPException(
            status_code=400,
            detail=(
                "You have already been marked present "
                "for this class."
            ),
        )


# =========================================================
# REGISTER STUDENT FACE
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

    # =====================================================
    # FACE OR FINGERPRINT IS ENOUGH
    # =====================================================

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
        "fingerprint_registered": bool(
            biometric.fingerprint_credential_id
        ),
        "biometric_ready": True,
        "biometric_complete": True,
        "status": biometric.biometric_status,
    }


# =========================================================
# STUDENT FINGERPRINT REGISTRATION - OPTIONS
# =========================================================

@router.get(
    "/students/{student_id}/fingerprint/options"
)
def generate_fingerprint_registration_options(
    student_id: int,
    request: Request,
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

    # =====================================================
    # FACE IS NOT REQUIRED
    # =====================================================

    if not biometric:

        biometric = StudentBiometric(
            student_id=student_id
        )

        db.add(biometric)
        db.flush()

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

    config = get_webauthn_config(request)

    user_id = secrets.token_bytes(32)

    try:

        options = generate_registration_options(
            rp_id=config["rp_id"],
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
    # SAVE EVERYTHING REQUIRED FOR VERIFICATION
    # -----------------------------------------------------

    registration_challenges[
        f"student_{student_id}"
    ] = {
        "challenge": options.challenge,
        "rp_id": config["rp_id"],
        "origin": config["origin"],
    }

    print(
        "=========================================="
    )
    print(
        "STUDENT FINGERPRINT REGISTRATION OPTIONS"
    )
    print(
        f"Student ID: {student_id}"
    )
    print(
        f"RP ID: {config['rp_id']}"
    )
    print(
        f"Origin: {config['origin']}"
    )
    print(
        "=========================================="
    )

    return options_json_response(options)


# =========================================================
# STUDENT FINGERPRINT REGISTRATION - VERIFY
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
            detail="Student not found.",
        )

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

    # -----------------------------------------------------
    # GET SAVED CHALLENGE
    # -----------------------------------------------------

    registration_data = (
        registration_challenges.get(
            f"student_{student_id}"
        )
    )

    if not registration_data:

        raise HTTPException(
            status_code=400,
            detail=(
                "No active fingerprint registration "
                "request was found. Please start "
                "registration again."
            ),
        )

    expected_challenge = (
        registration_data["challenge"]
    )

    expected_rp_id = (
        registration_data["rp_id"]
    )

    expected_origin = (
        registration_data["origin"]
    )

    credential = data.model_dump(
        by_alias=True
    )

    print(
        "=========================================="
    )
    print(
        "VERIFYING STUDENT FINGERPRINT REGISTRATION"
    )
    print(
        f"Student ID: {student_id}"
    )
    print(
        f"RP ID: {expected_rp_id}"
    )
    print(
        f"Origin: {expected_origin}"
    )
    print(
        "=========================================="
    )

    # -----------------------------------------------------
    # VERIFY WEBAUTHN
    # -----------------------------------------------------

    try:

        verification = verify_registration_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=expected_rp_id,
            expected_origin=expected_origin,
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
                "Fingerprint registration could "
                "not be verified. "
                f"Reason: {str(exc)}"
            ),
        )

    # -----------------------------------------------------
    # SAVE CREDENTIAL ID
    # -----------------------------------------------------

    credential_id = (
        base64.urlsafe_b64encode(
            verification.credential_id
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    # -----------------------------------------------------
    # SAVE PUBLIC KEY
    # -----------------------------------------------------

    public_key = (
        base64.urlsafe_b64encode(
            verification.credential_public_key
        )
        .rstrip(b"=")
        .decode("utf-8")
    )

    biometric.fingerprint_credential_id = (
        credential_id
    )

    biometric.fingerprint_public_key = (
        public_key
    )

    biometric.fingerprint_sign_count = (
        verification.sign_count
    )

    # =====================================================
    # FACE OR FINGERPRINT
    # =====================================================

    if biometric.face_embedding:

        biometric.biometric_status = "complete"

    else:

        biometric.biometric_status = (
            "fingerprint_registered"
        )

    db.commit()
    db.refresh(biometric)

    registration_challenges.pop(
        f"student_{student_id}",
        None
    )

    return {
        "success": True,
        "verified": True,
        "message": (
            "Fingerprint registered successfully."
        ),
        "student_id": student_id,
        "face_registered": bool(
            biometric.face_embedding
        ),
        "fingerprint_registered": True,
        "biometric_ready": True,
        "biometric_complete": True,
        "status": biometric.biometric_status,
    }


# =========================================================
# STUDENT BIOMETRIC STATUS
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
        and bool(biometric.face_embedding)
    )

    fingerprint_registered = (
        biometric is not None
        and bool(
            biometric.fingerprint_credential_id
        )
    )

    biometric_ready = (
        face_registered
        or fingerprint_registered
    )

    if face_registered and fingerprint_registered:

        status = "complete"

    elif face_registered:

        status = "face_registered"

    elif fingerprint_registered:

        status = "fingerprint_registered"

    else:

        status = "incomplete"

    return {
        "student_id": student_id,
        "face_registered": face_registered,
        "fingerprint_registered": fingerprint_registered,
        "biometric_ready": biometric_ready,
        "biometric_complete": biometric_ready,
        "status": status,
    }


# =========================================================
# STUDENT FINGERPRINT ATTENDANCE - OPTIONS
# =========================================================

@router.get(
    "/attendance/fingerprint/options"
)
def generate_fingerprint_attendance_options(
    request: Request,
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    student_id = current_user["user_id"]

    # -----------------------------------------------------
    # ACTIVE SESSION
    # -----------------------------------------------------

    session = get_active_attendance_session(
        student_id,
        db,
    )

    # -----------------------------------------------------
    # BIOMETRIC
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
    # DUPLICATE CHECK
    # -----------------------------------------------------

    check_existing_session_attendance(
        student_id,
        session,
        db,
    )

    # -----------------------------------------------------
    # WEBAUTHN CONFIG
    # -----------------------------------------------------

    config = get_webauthn_config(request)

    # -----------------------------------------------------
    # CREDENTIAL ID
    # -----------------------------------------------------

    credential_id = decode_base64url(
        biometric.fingerprint_credential_id,
        "fingerprint credential",
    )

    # -----------------------------------------------------
    # AUTHENTICATION OPTIONS
    # -----------------------------------------------------

    challenge = secrets.token_bytes(32)

    try:

        options = generate_authentication_options(
            rp_id=config["rp_id"],
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
    # SAVE CHALLENGE + CONFIG
    # -----------------------------------------------------

    authentication_challenges[
        student_id
    ] = {
        "challenge": options.challenge,
        "rp_id": config["rp_id"],
        "origin": config["origin"],
        "session_id": session.id,
    }

    print(
        "=========================================="
    )
    print(
        "STUDENT FINGERPRINT ATTENDANCE OPTIONS"
    )
    print(
        f"Student ID: {student_id}"
    )
    print(
        f"Session ID: {session.id}"
    )
    print(
        f"Module ID: {session.module_id}"
    )
    print(
        f"RP ID: {config['rp_id']}"
    )
    print(
        f"Origin: {config['origin']}"
    )
    print(
        "=========================================="
    )

    return options_json_response(options)


# =========================================================
# STUDENT FINGERPRINT ATTENDANCE - VERIFY
# =========================================================

@router.post(
    "/attendance/fingerprint/verify"
)
def verify_fingerprint_attendance(
    credential: dict,
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    student_id = current_user["user_id"]

    # -----------------------------------------------------
    # ACTIVE SESSION
    # -----------------------------------------------------

    session = get_active_attendance_session(
        student_id,
        db,
    )

    # -----------------------------------------------------
    # DUPLICATE CHECK
    # -----------------------------------------------------

    check_existing_session_attendance(
        student_id,
        session,
        db,
    )

    # -----------------------------------------------------
    # BIOMETRIC
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
    # CHALLENGE
    # -----------------------------------------------------

    authentication_data = (
        authentication_challenges.get(
            student_id
        )
    )

    if not authentication_data:

        raise HTTPException(
            status_code=400,
            detail=(
                "No active fingerprint authentication "
                "request was found. Please try again."
            ),
        )

    expected_challenge = (
        authentication_data["challenge"]
    )

    expected_rp_id = (
        authentication_data["rp_id"]
    )

    expected_origin = (
        authentication_data["origin"]
    )

    expected_session_id = (
        authentication_data["session_id"]
    )

    # -----------------------------------------------------
    # MAKE SURE THE CHALLENGE BELONGS TO THIS SESSION
    # -----------------------------------------------------

    if expected_session_id != session.id:

        authentication_challenges.pop(
            student_id,
            None,
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "The fingerprint request belongs to "
                "a different attendance session. "
                "Please try again."
            ),
        )

    credential_id = decode_base64url(
        biometric.fingerprint_credential_id,
        "fingerprint credential",
    )

    public_key = decode_base64url(
        biometric.fingerprint_public_key,
        "fingerprint public key",
    )

    print(
        "=========================================="
    )
    print(
        "VERIFYING STUDENT FINGERPRINT"
    )
    print(
        f"Student ID: {student_id}"
    )
    print(
        f"Session ID: {session.id}"
    )
    print(
        f"RP ID: {expected_rp_id}"
    )
    print(
        f"Origin: {expected_origin}"
    )
    print(
        f"Stored sign count: "
        f"{biometric.fingerprint_sign_count}"
    )
    print(
        "=========================================="
    )

    # -----------------------------------------------------
    # VERIFY WEBAUTHN
    # -----------------------------------------------------

    try:

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=expected_rp_id,
            expected_origin=expected_origin,
            credential_public_key=public_key,
            credential_current_sign_count=(
                biometric.fingerprint_sign_count
            ),
            require_user_verification=True,
        )

    except Exception as exc:

        print(
            "=========================================="
        )
        print(
            "FINGERPRINT AUTHENTICATION FAILED"
        )
        print(
            repr(exc)
        )
        print(
            "=========================================="
        )

        raise HTTPException(
            status_code=401,
            detail=(
                "Fingerprint verification failed. "
                f"Reason: {str(exc)}"
            ),
        )

    # -----------------------------------------------------
    # CREDENTIAL MATCH
    # -----------------------------------------------------

    if verification.credential_id != credential_id:

        raise HTTPException(
            status_code=401,
            detail=(
                "Fingerprint credential does not match."
            ),
        )

    # -----------------------------------------------------
    # USER VERIFICATION
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
    #
    # MODULE COMES FROM ACTIVE SESSION.
    # STUDENT DOES NOT SELECT MODULE.
    # -----------------------------------------------------

    new_attendance = Attendance(
        student_id=student_id,
        module_id=session.module_id,
        date=session.session_date,
        time_in=datetime.now(),
    )

    db.add(new_attendance)

    db.commit()
    db.refresh(new_attendance)

    authentication_challenges.pop(
        student_id,
        None,
    )

    return {
        "success": True,
        "verified": True,
        "method": "fingerprint",
        "message": (
            "Fingerprint verified and attendance "
            "recorded successfully."
        ),
        "student_id": student_id,
        "module_id": session.module_id,
        "session_id": session.id,
        "attendance_id": new_attendance.id,
        "date": str(new_attendance.date),
        "time_in": str(new_attendance.time_in),
    }


# =========================================================
# STUDENT FACE ATTENDANCE - VERIFY
# =========================================================

@router.post(
    "/attendance/face/verify"
)
def verify_face_attendance(
    face_embedding: str,
    current_user=Depends(
        require_role("student")
    ),
    db: Session = Depends(get_db),
):

    student_id = current_user["user_id"]

    # -----------------------------------------------------
    # ACTIVE SESSION
    # -----------------------------------------------------

    session = get_active_attendance_session(
        student_id,
        db,
    )

    # -----------------------------------------------------
    # DUPLICATE CHECK
    # -----------------------------------------------------

    check_existing_session_attendance(
        student_id,
        session,
        db,
    )

    # -----------------------------------------------------
    # BIOMETRIC
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
    # CHECK SIZE
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
    # EUCLIDEAN DISTANCE
    # -----------------------------------------------------

    distance = sum(
        (
            registered_embedding[i]
            - submitted_embedding[i]
        ) ** 2
        for i in range(128)
    ) ** 0.5

    FACE_THRESHOLD = 0.6

    print(
        "===================================="
    )
    print(
        "FACE VERIFICATION"
    )
    print(
        f"Student ID: {student_id}"
    )
    print(
        f"Distance: {distance:.4f}"
    )
    print(
        f"Threshold: {FACE_THRESHOLD}"
    )
    print(
        f"Match: {distance <= FACE_THRESHOLD}"
    )
    print(
        "===================================="
    )

    # -----------------------------------------------------
    # FACE FAILED
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
        module_id=session.module_id,
        date=session.session_date,
        time_in=datetime.now(),
    )

    db.add(new_attendance)

    db.commit()
    db.refresh(new_attendance)

    return {
        "success": True,
        "verified": True,
        "method": "face",
        "message": (
            "Face verified and attendance "
            "recorded successfully."
        ),
        "student_id": student_id,
        "module_id": session.module_id,
        "session_id": session.id,
        "attendance_id": new_attendance.id,
        "date": str(new_attendance.date),
        "time_in": str(new_attendance.time_in),
        "face_distance": distance,
    }


# =========================================================
# EMPLOYEE FACE REGISTRATION
# =========================================================
#
# Same biometric table is used.
# employee_id is populated instead of student_id.
#
# Only lecturers and assistant lecturers can use biometric
# attendance.
# =========================================================

@router.post(
    "/employees/{employee_id}/face"
)
def register_employee_face(
    employee_id: int,
    data: FaceRegistration,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db),
):

    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    if employee.role not in [
        "lecturer",
        "assistant lecturer",
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Biometric attendance registration "
                "is only available for lecturers "
                "and assistant lecturers."
            ),
        )

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.employee_id == employee_id
    ).first()

    if not biometric:

        biometric = StudentBiometric(
            employee_id=employee_id
        )

        db.add(biometric)
        db.flush()

    biometric.face_embedding = (
        data.face_embedding
    )

    if biometric.fingerprint_credential_id:

        biometric.biometric_status = "complete"

    else:

        biometric.biometric_status = "face_registered"

    db.commit()
    db.refresh(biometric)

    return {
        "success": True,
        "message": (
            "Employee face registered successfully."
        ),
        "employee_id": employee_id,
        "face_registered": True,
        "fingerprint_registered": bool(
            biometric.fingerprint_credential_id
        ),
        "biometric_ready": True,
        "biometric_complete": True,
        "status": biometric.biometric_status,
    }


# =========================================================
# EMPLOYEE FINGERPRINT REGISTRATION - OPTIONS
# =========================================================

@router.get(
    "/employees/{employee_id}/fingerprint/options"
)
def generate_employee_fingerprint_registration_options(
    employee_id: int,
    request: Request,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db),
):

    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    if employee.role not in [
        "lecturer",
        "assistant lecturer",
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint registration is only "
                "available for lecturers and "
                "assistant lecturers."
            ),
        )

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.employee_id == employee_id
    ).first()

    if not biometric:

        biometric = StudentBiometric(
            employee_id=employee_id
        )

        db.add(biometric)
        db.flush()

    if biometric.fingerprint_credential_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint is already registered "
                "for this employee."
            ),
        )

    config = get_webauthn_config(request)

    user_id = secrets.token_bytes(32)

    try:

        options = generate_registration_options(
            rp_id=config["rp_id"],
            rp_name=RP_NAME,
            user_id=user_id,
            user_name=employee.email,
            user_display_name=(
                f"{employee.first_name} "
                f"{employee.last_name}"
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
            "Employee WebAuthn registration options "
            "generation failed:",
            repr(exc)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The server could not create the "
                "fingerprint registration request."
            ),
        )

    registration_challenges[
        f"employee_{employee_id}"
    ] = {
        "challenge": options.challenge,
        "rp_id": config["rp_id"],
        "origin": config["origin"],
    }

    print(
        "=========================================="
    )
    print(
        "EMPLOYEE FINGERPRINT REGISTRATION OPTIONS"
    )
    print(
        f"Employee ID: {employee_id}"
    )
    print(
        f"RP ID: {config['rp_id']}"
    )
    print(
        f"Origin: {config['origin']}"
    )
    print(
        "=========================================="
    )

    return options_json_response(options)


# =========================================================
# EMPLOYEE FINGERPRINT REGISTRATION - VERIFY
# =========================================================

@router.post(
    "/employees/{employee_id}/fingerprint/verify"
)
def verify_employee_fingerprint_registration(
    employee_id: int,
    data: FingerprintRegistration,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db),
):

    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    if employee.role not in [
        "lecturer",
        "assistant lecturer",
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint registration is only "
                "available for lecturers and "
                "assistant lecturers."
            ),
        )

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.employee_id == employee_id
    ).first()

    if not biometric:

        raise HTTPException(
            status_code=400,
            detail="Biometric registration not found.",
        )

    registration_data = (
        registration_challenges.get(
            f"employee_{employee_id}"
        )
    )

    if not registration_data:

        raise HTTPException(
            status_code=400,
            detail=(
                "No active fingerprint registration "
                "request was found. Please start "
                "registration again."
            ),
        )

    expected_challenge = (
        registration_data["challenge"]
    )

    expected_rp_id = (
        registration_data["rp_id"]
    )

    expected_origin = (
        registration_data["origin"]
    )

    credential = data.model_dump(
        by_alias=True
    )

    try:

        verification = verify_registration_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=expected_rp_id,
            expected_origin=expected_origin,
            require_user_verification=True,
        )

    except Exception as exc:

        print(
            "Employee WebAuthn registration verification "
            "failed:",
            repr(exc)
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Fingerprint registration could "
                "not be verified. "
                f"Reason: {str(exc)}"
            ),
        )

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

    biometric.fingerprint_credential_id = (
        credential_id
    )

    biometric.fingerprint_public_key = (
        public_key
    )

    biometric.fingerprint_sign_count = (
        verification.sign_count
    )

    if biometric.face_embedding:

        biometric.biometric_status = "complete"

    else:

        biometric.biometric_status = (
            "fingerprint_registered"
        )

    db.commit()
    db.refresh(biometric)

    registration_challenges.pop(
        f"employee_{employee_id}",
        None
    )

    return {
        "success": True,
        "verified": True,
        "message": (
            "Employee fingerprint registered successfully."
        ),
        "employee_id": employee_id,
        "face_registered": bool(
            biometric.face_embedding
        ),
        "fingerprint_registered": True,
        "biometric_ready": True,
        "biometric_complete": True,
        "status": biometric.biometric_status,
    }


# =========================================================
# EMPLOYEE BIOMETRIC STATUS
# =========================================================

@router.get(
    "/employees/{employee_id}"
)
def get_employee_biometric_status(
    employee_id: int,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db),
):

    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    biometric = db.query(
        StudentBiometric
    ).filter(
        StudentBiometric.employee_id == employee_id
    ).first()

    face_registered = (
        biometric is not None
        and bool(biometric.face_embedding)
    )

    fingerprint_registered = (
        biometric is not None
        and bool(
            biometric.fingerprint_credential_id
        )
    )

    biometric_ready = (
        face_registered
        or fingerprint_registered
    )

    if face_registered and fingerprint_registered:

        status = "complete"

    elif face_registered:

        status = "face_registered"

    elif fingerprint_registered:

        status = "fingerprint_registered"

    else:

        status = "incomplete"

    return {
        "employee_id": employee_id,
        "employee_name": (
            f"{employee.first_name} "
            f"{employee.last_name}"
        ),
        "role": employee.role,
        "face_registered": face_registered,
        "fingerprint_registered": fingerprint_registered,
        "biometric_ready": biometric_ready,
        "biometric_complete": biometric_ready,
        "status": status,
    }