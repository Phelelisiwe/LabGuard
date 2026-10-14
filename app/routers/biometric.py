
from datetime import datetime
import base64
import json
import os
import secrets
from hmac import compare_digest

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student
from app.models.employee import Employee
from app.models.biometric import StudentBiometric
from app.models.attendance import Attendance, StudentModule
from app.models.attendance_session import AttendanceSession
from app.models.timetable import Timetable
from app.schemas.biometric import FaceRegistration, FingerprintRegistration
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


router = APIRouter(prefix="/biometric", tags=["Biometric Registration"])

RP_ID = os.getenv(
    "WEBAUTHN_RP_ID",
    "labguard-1-pwhe.onrender.com",
)
ORIGIN = os.getenv(
    "WEBAUTHN_ORIGIN",
    "https://labguard-1-pwhe.onrender.com",
)
RP_NAME = os.getenv("WEBAUTHN_RP_NAME", "LabGuard")

registration_challenges = {}
authentication_challenges = {}


# =========================================================
# GENERAL HELPERS
# =========================================================

def get_webauthn_config(request: Request):
    origin = request.headers.get("origin")

    if origin in (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ):
        return {"rp_id": "localhost", "origin": origin}

    if origin == ORIGIN or not origin:
        return {"rp_id": RP_ID, "origin": ORIGIN}

    raise HTTPException(
        status_code=400,
        detail=f"WebAuthn request came from an unauthorized origin: {origin}",
    )


def options_json_response(options):
    try:
        result = options_to_json(options)

        if isinstance(result, str):
            result = json.loads(result)

        if not isinstance(result, dict):
            raise ValueError("WebAuthn options must be a JSON object.")

        return JSONResponse(content=result)

    except Exception as exc:
        print("WebAuthn options serialization failed:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="The server could not generate valid WebAuthn options.",
        )


def decode_base64url(value: str, field_name: str) -> bytes:
    try:
        padding = "=" * ((4 - len(value) % 4) % 4)
        return base64.urlsafe_b64decode(value + padding)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=f"Stored {field_name} is invalid.",
        )


def get_biometric_by_student(student_id: int, db: Session):
    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if biometric is None:
        biometric = StudentBiometric(student_id=student_id)
        db.add(biometric)
        db.flush()

    return biometric


def get_biometric_by_employee(employee_id: int, db: Session):
    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.employee_id == employee_id
    ).first()

    if biometric is None:
        biometric = StudentBiometric(employee_id=employee_id)
        db.add(biometric)
        db.flush()

    return biometric


def has_physical_fingerprint(biometric) -> bool:
    return (
        biometric is not None
        and getattr(biometric, "fingerprint_sensor_slot", None) is not None
    )


def has_fingerprint(biometric) -> bool:
    return (
        biometric is not None
        and (
            bool(biometric.fingerprint_credential_id)
            or has_physical_fingerprint(biometric)
        )
    )


def biometric_status(biometric):
    face = biometric is not None and bool(biometric.face_embedding)
    fingerprint = has_fingerprint(biometric)

    if face and fingerprint:
        status = "complete"
    elif face:
        status = "face_registered"
    elif fingerprint:
        status = "fingerprint_registered"
    else:
        status = "incomplete"

    return face, fingerprint, status


def verify_esp32_token(device_token: str):
    expected_token = os.getenv("ESP32_DEVICE_TOKEN")

    if not expected_token:
        raise HTTPException(
            status_code=503,
            detail="ESP32 device authentication is not configured.",
        )

    if not compare_digest(device_token, expected_token):
        raise HTTPException(
            status_code=401,
            detail="Invalid ESP32 device token.",
        )


def get_active_attendance_session(student_id: int, db: Session):
    session = db.query(AttendanceSession).filter(
        AttendanceSession.status == "active",
        AttendanceSession.session_date == datetime.now().date(),
    ).first()

    if session is None:
        raise HTTPException(
            status_code=400,
            detail="There is currently no active attendance session.",
        )

    registration = db.query(StudentModule).filter(
        StudentModule.student_id == student_id,
        StudentModule.module_id == session.module_id,
    ).first()

    if registration is None:
        raise HTTPException(
            status_code=403,
            detail="You are not registered for the module currently being taught.",
        )

    return session


def check_existing_session_attendance(
    student_id: int,
    session,
    db: Session,
):
    existing = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.module_id == session.module_id,
        Attendance.date == session.session_date,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already been marked present for this class.",
        )


def save_attendance(student_id: int, session, method: str, db: Session):
    check_existing_session_attendance(student_id, session, db)

    attendance = Attendance(
        student_id=student_id,
        module_id=session.module_id,
        date=session.session_date,
        time_in=datetime.now(),
    )

    db.add(attendance)

    try:
        db.commit()
        db.refresh(attendance)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not record attendance.",
        )

    return {
        "success": True,
        "verified": True,
        "authorized": True,
        "door_action": "keep_locked",
        "method": method,
        "message": "Fingerprint or face verified and attendance recorded.",
        "student_id": student_id,
        "module_id": session.module_id,
        "session_id": session.id,
        "attendance_id": attendance.id,
        "date": str(attendance.date),
        "time_in": str(attendance.time_in),
    }


# =========================================================
# STUDENT FACE REGISTRATION
# =========================================================

@router.post("/students/{student_id}/face")
def register_face(
    student_id: int,
    data: FaceRegistration,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    biometric = get_biometric_by_student(student_id, db)
    biometric.face_embedding = data.face_embedding

    face, fingerprint, status = biometric_status(biometric)
    biometric.biometric_status = status

    try:
        db.commit()
        db.refresh(biometric)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the student's face registration.",
        )

    return {
        "success": True,
        "message": "Face registered successfully.",
        "student_id": student_id,
        "face_registered": face,
        "fingerprint_registered": fingerprint,
        "biometric_ready": face or fingerprint,
        "biometric_complete": face or fingerprint,
        "status": status,
    }


# =========================================================
# STUDENT WEBAUTHN FINGERPRINT REGISTRATION
# This is browser-based authentication, not the FPM10A sensor.
# =========================================================

@router.get("/students/{student_id}/fingerprint/options")
def generate_fingerprint_registration_options(
    student_id: int,
    request: Request,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    biometric = get_biometric_by_student(student_id, db)

    if biometric.fingerprint_credential_id:
        raise HTTPException(
            status_code=409,
            detail="A WebAuthn fingerprint credential is already registered.",
        )

    config = get_webauthn_config(request)

    try:
        options = generate_registration_options(
            rp_id=config["rp_id"],
            rp_name=RP_NAME,
            user_id=secrets.token_bytes(32),
            user_name=student.email or f"student-{student.student_number}",
            user_display_name=f"{student.first_name} {student.last_name}",
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
        )
    except Exception as exc:
        print("Student registration options failed:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Could not create the fingerprint registration request.",
        )

    registration_challenges[f"student_{student_id}"] = {
        "challenge": options.challenge,
        "rp_id": config["rp_id"],
        "origin": config["origin"],
    }

    return options_json_response(options)


@router.post("/students/{student_id}/fingerprint/verify")
def verify_fingerprint_registration(
    student_id: int,
    data: FingerprintRegistration,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    biometric = get_biometric_by_student(student_id, db)
    saved = registration_challenges.get(f"student_{student_id}")

    if not saved:
        raise HTTPException(
            status_code=400,
            detail="No active registration request. Start registration again.",
        )

    try:
        verification = verify_registration_response(
            credential=data.model_dump(by_alias=True),
            expected_challenge=saved["challenge"],
            expected_rp_id=saved["rp_id"],
            expected_origin=saved["origin"],
            require_user_verification=True,
        )
    except Exception as exc:
        print("Student fingerprint verification failed:", repr(exc))
        raise HTTPException(
            status_code=400,
            detail=f"Fingerprint registration could not be verified: {exc}",
        )

    biometric.fingerprint_credential_id = (
        base64.urlsafe_b64encode(verification.credential_id)
        .rstrip(b"=").decode("utf-8")
    )
    biometric.fingerprint_public_key = (
        base64.urlsafe_b64encode(verification.credential_public_key)
        .rstrip(b"=").decode("utf-8")
    )
    biometric.fingerprint_sign_count = verification.sign_count

    face, fingerprint, status = biometric_status(biometric)
    biometric.biometric_status = status

    try:
        db.commit()
        db.refresh(biometric)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the fingerprint registration.",
        )

    registration_challenges.pop(f"student_{student_id}", None)

    return {
        "success": True,
        "verified": True,
        "message": "Fingerprint registered successfully.",
        "student_id": student_id,
        "face_registered": face,
        "fingerprint_registered": fingerprint,
        "biometric_ready": face or fingerprint,
        "biometric_complete": face or fingerprint,
        "status": status,
    }


# =========================================================
# STUDENT BIOMETRIC STATUS
# =========================================================

@router.get("/students/{student_id}")
def get_biometric_status(
    student_id: int,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    face, fingerprint, status = biometric_status(biometric)

    return {
        "student_id": student_id,
        "face_registered": face,
        "fingerprint_registered": fingerprint,
        "physical_fingerprint_registered": has_physical_fingerprint(biometric),
        "fingerprint_sensor_slot": (
            biometric.fingerprint_sensor_slot if biometric else None
        ),
        "fingerprint_enrollment_pending": (
            biometric.fingerprint_enrollment_pending if biometric else False
        ),
        "fingerprint_revocation_pending": (
            biometric.fingerprint_revocation_pending if biometric else False
        ),
        "biometric_ready": face or fingerprint,
        "biometric_complete": face or fingerprint,
        "status": status,
    }


# =========================================================
# STUDENT WEBAUTHN FINGERPRINT ATTENDANCE
# =========================================================

@router.get("/attendance/fingerprint/options")
def generate_fingerprint_attendance_options(
    request: Request,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student_id = current_user["user_id"]
    session = get_active_attendance_session(student_id, db)

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric or not biometric.fingerprint_credential_id:
        raise HTTPException(
            status_code=400,
            detail="A WebAuthn fingerprint is not registered.",
        )

    if not biometric.fingerprint_public_key:
        raise HTTPException(
            status_code=400,
            detail="Fingerprint public key is missing.",
        )

    check_existing_session_attendance(student_id, session, db)
    config = get_webauthn_config(request)

    credential_id = decode_base64url(
        biometric.fingerprint_credential_id,
        "fingerprint credential",
    )

    try:
        options = generate_authentication_options(
            rp_id=config["rp_id"],
            challenge=secrets.token_bytes(32),
            allow_credentials=[
                PublicKeyCredentialDescriptor(id=credential_id)
            ],
            user_verification=UserVerificationRequirement.REQUIRED,
        )
    except Exception as exc:
        print("Authentication options failed:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Could not create fingerprint authentication request.",
        )

    authentication_challenges[student_id] = {
        "challenge": options.challenge,
        "rp_id": config["rp_id"],
        "origin": config["origin"],
        "session_id": session.id,
    }

    return options_json_response(options)


@router.post("/attendance/fingerprint/verify")
def verify_fingerprint_attendance(
    credential: dict,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student_id = current_user["user_id"]
    session = get_active_attendance_session(student_id, db)

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric or not biometric.fingerprint_credential_id:
        raise HTTPException(
            status_code=400,
            detail="A WebAuthn fingerprint is not registered.",
        )

    if not biometric.fingerprint_public_key:
        raise HTTPException(
            status_code=400,
            detail="Fingerprint public key is missing.",
        )

    saved = authentication_challenges.get(student_id)

    if not saved:
        raise HTTPException(
            status_code=400,
            detail="No active authentication request. Please try again.",
        )

    if saved["session_id"] != session.id:
        authentication_challenges.pop(student_id, None)
        raise HTTPException(
            status_code=400,
            detail="The authentication request belongs to a different session.",
        )

    credential_id = decode_base64url(
        biometric.fingerprint_credential_id,
        "fingerprint credential",
    )
    public_key = decode_base64url(
        biometric.fingerprint_public_key,
        "fingerprint public key",
    )

    try:
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=saved["challenge"],
            expected_rp_id=saved["rp_id"],
            expected_origin=saved["origin"],
            credential_public_key=public_key,
            credential_current_sign_count=biometric.fingerprint_sign_count,
            require_user_verification=True,
        )
    except Exception as exc:
        print("Fingerprint authentication failed:", repr(exc))
        raise HTTPException(
            status_code=401,
            detail=f"Fingerprint verification failed: {exc}",
        )

    if verification.credential_id != credential_id:
        raise HTTPException(
            status_code=401,
            detail="Fingerprint credential does not match.",
        )

    if not verification.user_verified:
        raise HTTPException(
            status_code=401,
            detail="Fingerprint verification was not completed.",
        )

    biometric.fingerprint_sign_count = verification.new_sign_count

    result = save_attendance(
        student_id,
        session,
        "fingerprint",
        db,
    )

    authentication_challenges.pop(student_id, None)
    return result


# =========================================================
# STUDENT FACE ATTENDANCE
# =========================================================

@router.post("/attendance/face/verify")
def verify_face_attendance(
    face_embedding: str,
    current_user=Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    student_id = current_user["user_id"]
    session = get_active_attendance_session(student_id, db)

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if not biometric or not biometric.face_embedding:
        raise HTTPException(
            status_code=400,
            detail="Face is not registered.",
        )

    try:
        registered = [
            float(value) for value in biometric.face_embedding.split(",")
        ]
        submitted = [
            float(value) for value in face_embedding.split(",")
        ]
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid face embedding.",
        )

    if len(registered) != 128 or len(submitted) != 128:
        raise HTTPException(
            status_code=400,
            detail="Face embeddings must contain 128 values.",
        )

    distance = sum(
        (registered[i] - submitted[i]) ** 2
        for i in range(128)
    ) ** 0.5

    if distance > 0.6:
        raise HTTPException(
            status_code=401,
            detail="Face verification failed. The detected face does not match.",
        )

    result = save_attendance(student_id, session, "face", db)
    result["face_distance"] = distance
    return result


# =========================================================
# EMPLOYEE FACE REGISTRATION
# =========================================================

@router.post("/employees/{employee_id}/face")
def register_employee_face(
    employee_id: int,
    data: FaceRegistration,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if employee.role.strip().lower() not in (
        "lecturer",
        "assistant lecturer",
    ):
        raise HTTPException(
            status_code=400,
            detail="Biometric attendance is only available for lecturers and assistant lecturers.",
        )

    biometric = get_biometric_by_employee(employee_id, db)
    biometric.face_embedding = data.face_embedding

    face, fingerprint, status = biometric_status(biometric)
    biometric.biometric_status = status

    try:
        db.commit()
        db.refresh(biometric)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the employee face registration.",
        )

    return {
        "success": True,
        "message": "Employee face registered successfully.",
        "employee_id": employee_id,
        "face_registered": face,
        "fingerprint_registered": fingerprint,
        "biometric_ready": face or fingerprint,
        "biometric_complete": face or fingerprint,
        "status": status,
    }


# =========================================================
# EMPLOYEE WEBAUTHN FINGERPRINT REGISTRATION
# This is browser-based authentication, not the FPM10A sensor.
# =========================================================

@router.get("/employees/{employee_id}/fingerprint/options")
def generate_employee_fingerprint_registration_options(
    employee_id: int,
    request: Request,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if employee.role.strip().lower() not in (
        "lecturer",
        "assistant lecturer",
    ):
        raise HTTPException(
            status_code=400,
            detail="Fingerprint registration is only available for lecturers and assistant lecturers.",
        )

    biometric = get_biometric_by_employee(employee_id, db)

    if biometric.fingerprint_credential_id:
        raise HTTPException(
            status_code=409,
            detail="A WebAuthn fingerprint credential is already registered.",
        )

    config = get_webauthn_config(request)

    try:
        options = generate_registration_options(
            rp_id=config["rp_id"],
            rp_name=RP_NAME,
            user_id=secrets.token_bytes(32),
            user_name=employee.email or f"employee-{employee_id}",
            user_display_name=f"{employee.first_name} {employee.last_name}",
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
        )
    except Exception as exc:
        print("Employee registration options failed:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Could not create the employee fingerprint registration request.",
        )

    registration_challenges[f"employee_{employee_id}"] = {
        "challenge": options.challenge,
        "rp_id": config["rp_id"],
        "origin": config["origin"],
    }

    return options_json_response(options)


@router.post("/employees/{employee_id}/fingerprint/verify")
def verify_employee_fingerprint_registration(
    employee_id: int,
    data: FingerprintRegistration,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if employee.role.strip().lower() not in (
        "lecturer",
        "assistant lecturer",
    ):
        raise HTTPException(
            status_code=400,
            detail="Fingerprint registration is only available for lecturers and assistant lecturers.",
        )

    biometric = get_biometric_by_employee(employee_id, db)
    saved = registration_challenges.get(f"employee_{employee_id}")

    if not saved:
        raise HTTPException(
            status_code=400,
            detail="No active registration request. Start registration again.",
        )

    try:
        verification = verify_registration_response(
            credential=data.model_dump(by_alias=True),
            expected_challenge=saved["challenge"],
            expected_rp_id=saved["rp_id"],
            expected_origin=saved["origin"],
            require_user_verification=True,
        )
    except Exception as exc:
        print("Employee fingerprint verification failed:", repr(exc))
        raise HTTPException(
            status_code=400,
            detail=f"Fingerprint registration could not be verified: {exc}",
        )

    biometric.fingerprint_credential_id = (
        base64.urlsafe_b64encode(verification.credential_id)
        .rstrip(b"=").decode("utf-8")
    )
    biometric.fingerprint_public_key = (
        base64.urlsafe_b64encode(verification.credential_public_key)
        .rstrip(b"=").decode("utf-8")
    )
    biometric.fingerprint_sign_count = verification.sign_count

    face, fingerprint, status = biometric_status(biometric)
    biometric.biometric_status = status

    try:
        db.commit()
        db.refresh(biometric)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the employee fingerprint registration.",
        )

    registration_challenges.pop(f"employee_{employee_id}", None)

    return {
        "success": True,
        "verified": True,
        "message": "Employee fingerprint registered successfully.",
        "employee_id": employee_id,
        "face_registered": face,
        "fingerprint_registered": fingerprint,
        "biometric_ready": face or fingerprint,
        "biometric_complete": face or fingerprint,
        "status": status,
    }


# =========================================================
# EMPLOYEE BIOMETRIC STATUS
# =========================================================

@router.get("/employees/{employee_id}")
def get_employee_biometric_status(
    employee_id: int,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.employee_id == employee_id
    ).first()

    face, fingerprint, status = biometric_status(biometric)

    return {
        "employee_id": employee_id,
        "employee_number": employee.employee_number,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "role": employee.role,
        "face_registered": face,
        "fingerprint_registered": fingerprint,
        "physical_fingerprint_registered": has_physical_fingerprint(biometric),
        "fingerprint_sensor_slot": (
            biometric.fingerprint_sensor_slot if biometric else None
        ),
        "fingerprint_enrollment_pending": (
            biometric.fingerprint_enrollment_pending if biometric else False
        ),
        "fingerprint_revocation_pending": (
            biometric.fingerprint_revocation_pending if biometric else False
        ),
        "biometric_ready": face or fingerprint,
        "biometric_complete": face or fingerprint,
        "status": status,
    }


# =========================================================
# PHYSICAL FPM10A FINGERPRINT ENROLLMENT
# =========================================================

@router.post("/students/{student_id}/fingerprint/sensor/enroll")
def request_physical_fingerprint_enrollment(
    student_id: int,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    biometric = get_biometric_by_student(student_id, db)

    if has_physical_fingerprint(biometric):
        raise HTTPException(
            status_code=409,
            detail="This student already has a physical fingerprint registered.",
        )

    if biometric.fingerprint_revocation_pending:
        raise HTTPException(
            status_code=409,
            detail="A fingerprint deletion is still pending on the sensor.",
        )

    if biometric.fingerprint_enrollment_pending:
        return {
            "success": True,
            "student_id": student_id,
            "fingerprint_enrollment_pending": True,
            "message": "Student fingerprint enrollment is already pending.",
        }

    biometric.fingerprint_enrollment_pending = True

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not request student fingerprint enrollment.",
        )

    return {
        "success": True,
        "message": "Physical fingerprint enrollment requested.",
        "student_id": student_id,
        "fingerprint_registered": False,
        "fingerprint_enrollment_pending": True,
    }


@router.post("/employees/{employee_number}/fingerprint/sensor/enroll")
def request_employee_fingerprint_enrollment(
    employee_number: str,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    employee = db.query(Employee).filter(
        Employee.employee_number == employee_number
    ).first()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    if employee.role.strip().lower() != "lecturer":
        raise HTTPException(
            status_code=400,
            detail="Only lecturers can use this enrollment endpoint.",
        )

    biometric = get_biometric_by_employee(employee.id, db)

    if biometric.fingerprint_sensor_slot is not None:
        raise HTTPException(
            status_code=409,
            detail="This lecturer already has a physical fingerprint registered.",
        )

    if biometric.fingerprint_revocation_pending:
        raise HTTPException(
            status_code=409,
            detail="Fingerprint revocation is pending.",
        )

    if biometric.fingerprint_enrollment_pending:
        return {
            "success": True,
            "employee_number": employee.employee_number,
            "fingerprint_enrollment_pending": True,
            "message": "Enrollment is already pending.",
        }

    biometric.fingerprint_enrollment_pending = True

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not request lecturer fingerprint enrollment.",
        )

    return {
        "success": True,
        "employee_number": employee.employee_number,
        "fingerprint_enrollment_pending": True,
        "message": "Lecturer fingerprint enrollment requested.",
    }


@router.get("/device/fingerprint/enrollment/pending")
def get_pending_sensor_enrollment(
    x_device_token: str = Header(alias="X-Device-Token"),
    db: Session = Depends(get_db),
):
    verify_esp32_token(x_device_token)

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.fingerprint_enrollment_pending.is_(True),
        StudentBiometric.fingerprint_sensor_slot.is_(None),
    ).order_by(StudentBiometric.id.asc()).first()

    if biometric is None:
        return {
            "success": True,
            "pending": False,
            "message": "No fingerprint enrollment is waiting.",
        }

    if biometric.student_id is not None:
        student = db.query(Student).filter(
            Student.id == biometric.student_id
        ).first()

        if student is None:
            raise HTTPException(
                status_code=409,
                detail="Pending enrollment references a missing student.",
            )

        return {
            "success": True,
            "pending": True,
            "person_type": "student",
            "student_id": student.id,
            "student_number": student.student_number,
            "person_name": f"{student.first_name} {student.last_name}",
            "message": "Enroll this student's fingerprint on the sensor.",
        }

    if biometric.employee_id is not None:
        employee = db.query(Employee).filter(
            Employee.id == biometric.employee_id
        ).first()

        if employee is None:
            raise HTTPException(
                status_code=409,
                detail="Pending enrollment references a missing employee.",
            )

        if employee.role.strip().lower() != "lecturer":
            raise HTTPException(
                status_code=400,
                detail="Only lecturers can use physical fingerprint enrollment.",
            )

        return {
            "success": True,
            "pending": True,
            "person_type": "employee",
            "employee_number": employee.employee_number,
            "person_name": f"{employee.first_name} {employee.last_name}",
            "message": "Enroll this lecturer's fingerprint on the sensor.",
        }

    raise HTTPException(
        status_code=409,
        detail="Enrollment is not linked to a student or employee.",
    )


@router.post("/device/fingerprint/enrollment/complete")
def complete_sensor_enrollment(
    data: dict,
    x_device_token: str = Header(alias="X-Device-Token"),
    db: Session = Depends(get_db),
):
    verify_esp32_token(x_device_token)

    try:
        sensor_slot = int(data["sensor_slot"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="sensor_slot must be an integer.",
        )

    if sensor_slot < 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid sensor slot.",
        )

    person_type = data.get("person_type")

    if person_type == "student" or (
        person_type is None and "student_id" in data
    ):
        try:
            student_id = int(data["student_id"])
        except (KeyError, TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="student_id must be an integer.",
            )

        biometric = db.query(StudentBiometric).filter(
            StudentBiometric.student_id == student_id
        ).first()

        person_details = {"student_id": student_id}

    elif person_type == "employee" or (
        person_type is None and "employee_number" in data
    ):
        employee_number = data.get("employee_number")

        if not isinstance(employee_number, str) or not employee_number.strip():
            raise HTTPException(
                status_code=400,
                detail="employee_number must be a non-empty string.",
            )

        employee = db.query(Employee).filter(
            Employee.employee_number == employee_number.strip()
        ).first()

        if employee is None:
            raise HTTPException(
                status_code=404,
                detail="Employee not found.",
            )

        if employee.role.strip().lower() != "lecturer":
            raise HTTPException(
                status_code=400,
                detail="Only lecturers can be enrolled through this endpoint.",
            )

        biometric = db.query(StudentBiometric).filter(
            StudentBiometric.employee_id == employee.id
        ).first()

        person_details = {
            "employee_number": employee.employee_number,
            "employee_name": f"{employee.first_name} {employee.last_name}",
        }

    else:
        raise HTTPException(
            status_code=400,
            detail="Supply person_type and the matching student_id or employee_number.",
        )

    if biometric is None:
        raise HTTPException(
            status_code=404,
            detail="Biometric record not found.",
        )

    if not biometric.fingerprint_enrollment_pending:
        raise HTTPException(
            status_code=409,
            detail="No enrollment request is pending for this person.",
        )

    if biometric.fingerprint_sensor_slot is not None:
        raise HTTPException(
            status_code=409,
            detail="A physical fingerprint is already registered.",
        )

    if biometric.fingerprint_revocation_pending:
        raise HTTPException(
            status_code=409,
            detail="Fingerprint revocation is pending.",
        )

    existing_slot = db.query(StudentBiometric).filter(
        StudentBiometric.fingerprint_sensor_slot == sensor_slot,
        StudentBiometric.id != biometric.id,
    ).first()

    if existing_slot:
        raise HTTPException(
            status_code=409,
            detail="This fingerprint sensor slot is already assigned.",
        )

    biometric.fingerprint_sensor_slot = sensor_slot
    biometric.fingerprint_enrollment_pending = False

    _, _, status = biometric_status(biometric)
    biometric.biometric_status = status

    try:
        db.commit()
        db.refresh(biometric)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the fingerprint sensor registration.",
        )

    return {
        "success": True,
        "message": "Physical fingerprint registration saved.",
        **person_details,
        "sensor_slot": sensor_slot,
        "fingerprint_registered": True,
        "fingerprint_enrollment_pending": False,
        "status": status,
    }


# =========================================================
# PHYSICAL FINGERPRINT REVOCATION
# Currently supports student fingerprint revocation.
# =========================================================

@router.post("/students/{student_id}/fingerprint/sensor/revoke")
def request_physical_fingerprint_revocation(
    student_id: int,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found.")

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if biometric is None or biometric.fingerprint_sensor_slot is None:
        raise HTTPException(
            status_code=404,
            detail="No physical fingerprint is registered for this student.",
        )

    if biometric.fingerprint_enrollment_pending:
        raise HTTPException(
            status_code=409,
            detail="Cannot revoke a fingerprint while enrollment is pending.",
        )

    if biometric.fingerprint_revocation_pending:
        raise HTTPException(
            status_code=409,
            detail="Fingerprint revocation is already pending.",
        )

    biometric.fingerprint_revocation_pending = True

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not request fingerprint revocation.",
        )

    return {
        "success": True,
        "message": "Fingerprint deletion queued for the ESP32.",
        "student_id": student_id,
        "sensor_slot": biometric.fingerprint_sensor_slot,
        "fingerprint_revocation_pending": True,
    }


@router.get("/device/fingerprint/revocation/pending")
def get_pending_sensor_revocation(
    x_device_token: str = Header(alias="X-Device-Token"),
    db: Session = Depends(get_db),
):
    verify_esp32_token(x_device_token)

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.fingerprint_revocation_pending.is_(True),
        StudentBiometric.fingerprint_sensor_slot.isnot(None),
        StudentBiometric.student_id.isnot(None),
    ).order_by(StudentBiometric.id.asc()).first()

    if biometric is None:
        return {
            "success": True,
            "pending": False,
            "message": "No fingerprint revocation is waiting.",
        }

    return {
        "success": True,
        "pending": True,
        "student_id": biometric.student_id,
        "sensor_slot": biometric.fingerprint_sensor_slot,
        "message": "Delete this fingerprint slot from the sensor.",
    }


@router.post("/device/fingerprint/revocation/complete")
def complete_sensor_revocation(
    data: dict,
    x_device_token: str = Header(alias="X-Device-Token"),
    db: Session = Depends(get_db),
):
    verify_esp32_token(x_device_token)

    try:
        student_id = int(data["student_id"])
        sensor_slot = int(data["sensor_slot"])
        deleted = data["deleted"]
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="student_id, sensor_slot, and deleted are required.",
        )

    if not isinstance(deleted, bool):
        raise HTTPException(
            status_code=400,
            detail="'deleted' must be true or false.",
        )

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    if biometric is None:
        raise HTTPException(
            status_code=404,
            detail="Student biometric record not found.",
        )

    if not biometric.fingerprint_revocation_pending:
        raise HTTPException(
            status_code=409,
            detail="No fingerprint revocation is pending for this student.",
        )

    if biometric.fingerprint_sensor_slot != sensor_slot:
        raise HTTPException(
            status_code=409,
            detail="The supplied sensor slot does not match the pending revocation.",
        )

    if not deleted:
        raise HTTPException(
            status_code=409,
            detail="The sensor did not confirm fingerprint deletion.",
        )

    biometric.fingerprint_sensor_slot = None
    biometric.fingerprint_revocation_pending = False

    _, fingerprint, status = biometric_status(biometric)
    biometric.biometric_status = status

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="The sensor deleted the fingerprint, but the database update failed.",
        )

    return {
        "success": True,
        "message": "Physical fingerprint revocation completed.",
        "student_id": student_id,
        "sensor_slot": sensor_slot,
        "deleted": True,
        "fingerprint_registered": fingerprint,
        "status": status,
    }


# =========================================================
# LECTURER SESSION START
# A valid lecturer fingerprint starts a class only when exactly
# one active timetable entry matches the current day and time.
# =========================================================

def start_lecturer_session_from_sensor(
    employee: Employee,
    db: Session,
):
    now = datetime.now()
    today = now.date()
    current_time = now.time()
    day = now.strftime("%A")

    classes = db.query(Timetable).filter(
        Timetable.lecturer_id == employee.id,
        Timetable.day_of_week == day,
        Timetable.start_time <= current_time,
        Timetable.end_time >= current_time,
        Timetable.active.is_(True),
    ).all()

    if not classes:
        return {
            "success": True,
            "verified": True,
            "authorized": False,
            "door_action": "keep_locked",
            "message": "No class is scheduled for this lecturer at this time.",
        }

    if len(classes) > 1:
        return {
            "success": True,
            "verified": True,
            "authorized": False,
            "door_action": "keep_locked",
            "message": "Multiple timetable entries match. Administrator review is required.",
        }

    timetable = classes[0]

    existing = db.query(AttendanceSession).filter(
        AttendanceSession.lecturer_id == employee.id,
        AttendanceSession.session_date == today,
        AttendanceSession.status == "active",
    ).first()

    if existing:
        return {
            "success": True,
            "verified": True,
            "authorized": True,
            "door_action": "unlock",
            "already_active": True,
            "session_id": existing.id,
            "module_id": existing.module_id,
            "laboratory": existing.laboratory,
            "message": "Lecturer verified. The class session is already active.",
        }

    session = AttendanceSession(
        timetable_id=timetable.id,
        lecturer_id=employee.id,
        module_id=timetable.module_id,
        laboratory=timetable.laboratory,
        session_date=today,
        opened_at=now,
        status="active",
    )

    db.add(session)

    try:
        db.commit()
        db.refresh(session)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not start the lecturer's attendance session.",
        )

    return {
        "success": True,
        "verified": True,
        "authorized": True,
        "door_action": "unlock",
        "already_active": False,
        "session_id": session.id,
        "module_id": session.module_id,
        "laboratory": session.laboratory,
        "message": "Lecturer verified. The scheduled class session has started.",
    }


# =========================================================
# PHYSICAL FINGERPRINT ATTENDANCE
# ESP32 submits a matched sensor slot. The server determines
# whether it belongs to a student or a lecturer.
# =========================================================

@router.post("/device/fingerprint/attendance")
def record_sensor_fingerprint_attendance(
    data: dict,
    x_device_token: str = Header(alias="X-Device-Token"),
    db: Session = Depends(get_db),
):
    verify_esp32_token(x_device_token)

    try:
        sensor_slot = int(data["sensor_slot"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="sensor_slot must be an integer.",
        )

    if sensor_slot < 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid sensor slot.",
        )

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.fingerprint_sensor_slot == sensor_slot,
    ).first()

    if biometric is None:
        return {
            "success": True,
            "verified": False,
            "authorized": False,
            "door_action": "keep_locked",
            "message": "This fingerprint is not registered.",
        }

    if biometric.fingerprint_revocation_pending:
        return {
            "success": True,
            "verified": False,
            "authorized": False,
            "door_action": "keep_locked",
            "message": "This fingerprint is pending revocation.",
        }

    # Lecturer fingerprint: check timetable and start the class.
    if biometric.employee_id is not None:
        employee = db.query(Employee).filter(
            Employee.id == biometric.employee_id
        ).first()

        if (
            employee is None
            or employee.role.strip().lower() != "lecturer"
        ):
            return {
                "success": True,
                "verified": False,
                "authorized": False,
                "door_action": "keep_locked",
                "message": "Fingerprint is not assigned to an authorized lecturer.",
            }

        result = start_lecturer_session_from_sensor(employee, db)
        result["person_type"] = "employee"
        result["employee_number"] = employee.employee_number
        result["person_name"] = (
            f"{employee.first_name} {employee.last_name}"
        )
        return result

    # Student fingerprint: record attendance against the active session.
    if biometric.student_id is not None:
        student_id = biometric.student_id

        try:
            session = get_active_attendance_session(student_id, db)

            result = save_attendance(
                student_id,
                session,
                "physical_fingerprint",
                db,
            )

            result["person_type"] = "student"
            return result

        except HTTPException as exc:
            return {
                "success": True,
                "verified": True,
                "authorized": False,
                "door_action": "keep_locked",
                "student_id": student_id,
                "message": exc.detail,
            }

    return {
        "success": True,
        "verified": False,
        "authorized": False,
        "door_action": "keep_locked",
        "message": "Fingerprint record has no linked person.",
    }
