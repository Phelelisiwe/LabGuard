
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.student import Student
from app.models.biometric import StudentBiometric
from app.schemas.biometric import (
    FaceRegistration,
    FingerprintRegistration
)
from app.dependencies import require_role


router = APIRouter(
    prefix="/biometric",
    tags=["Biometric Registration"]
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
    db: Session = Depends(get_db)
):

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
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

    # If fingerprint already exists, registration is complete.
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
        "status": biometric.biometric_status
    }


# =========================================================
# REGISTER FINGERPRINT / WEBAUTHN
# =========================================================

@router.post("/students/{student_id}/fingerprint")
def register_fingerprint(
    student_id: int,
    data: FingerprintRegistration,
    current_user=Depends(
        require_role("super_admin")
    ),
    db: Session = Depends(get_db)
):

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    biometric = db.query(StudentBiometric).filter(
        StudentBiometric.student_id == student_id
    ).first()

    # -----------------------------------------------------
    # FACE MUST BE REGISTERED FIRST
    # -----------------------------------------------------

    if not biometric or not biometric.face_embedding:
        raise HTTPException(
            status_code=400,
            detail=(
                "Face registration must be completed "
                "before fingerprint registration"
            )
        )

    # -----------------------------------------------------
    # SAVE WEBAUTHN CREDENTIAL
    # -----------------------------------------------------

    biometric.fingerprint_credential_id = data.credential_id
    biometric.fingerprint_public_key = data.public_key
    biometric.biometric_status = "complete"

    db.commit()
    db.refresh(biometric)

    return {
        "success": True,
        "message": "Fingerprint registered successfully",
        "student_id": student_id,
        "face_registered": True,
        "fingerprint_registered": True,
        "biometric_complete": True,
        "status": "complete"
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
    db: Session = Depends(get_db)
):

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
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
        "status": status
    }

