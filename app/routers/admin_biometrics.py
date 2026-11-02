from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_role
from app.models.biometric import Biometric
from app.schemas.biometric import FPM10AEnrollRequest

router = APIRouter(prefix="/admin", tags=["Admin Biometrics"])

@router.post("/register-fpm10a")
def start_fpm10a_enrollment(
    data: FPM10AEnrollRequest,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):
    # Find existing record or create a new one
    if data.user_type == "student":
        biometric = db.query(Biometric).filter(Biometric.student_id == data.user_id).first()
        if not biometric:
            biometric = Biometric(student_id=data.user_id)
            db.add(biometric)
    else:
        biometric = db.query(Biometric).filter(Biometric.employee_id == data.user_id).first()
        if not biometric:
            biometric = Biometric(employee_id=data.user_id)
            db.add(biometric)
    
    # Turn on the pending flag for the Python bridge script
    biometric.fingerprint_enrollment_pending = True
    db.commit()
    
    return {"success": True, "message": "Hardware set to waiting mode. Place finger on scanner."}

@router.post("/cancel-fpm10a")
def cancel_fpm10a_enrollment(
    data: FPM10AEnrollRequest,
    current_user=Depends(require_role("super_admin")),
    db: Session = Depends(get_db)
):
    if data.user_type == "student":
        biometric = db.query(Biometric).filter(Biometric.student_id == data.user_id).first()
    else:
        biometric = db.query(Biometric).filter(Biometric.employee_id == data.user_id).first()
        
    if biometric:
        biometric.fingerprint_enrollment_pending = False
        db.commit()
        
    return {"success": True, "message": "Enrollment cancelled."}

@router.get("/check-pending/{user_id}")
def check_pending_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    # Called by the Python sensor script to check if Admin cancelled
    biometric = db.query(Biometric).filter(Biometric.student_id == user_id).first()
    is_pending = biometric.fingerprint_enrollment_pending if biometric else False
    return {"pending": is_pending}

@router.post("/link-fpm10a-slot")
def link_sensor_slot(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Called by the Python script after it successfully scans a finger.
    Saves the slot number and turns off the pending flag.
    """
    user_id = data.get("user_id")
    slot = data.get("fingerprint_sensor_slot")
    
    biometric = db.query(Biometric).filter(Biometric.student_id == user_id).first()
    if not biometric:
        raise HTTPException(status_code=404, detail="Biometric profile not found")
        
    biometric.fingerprint_sensor_slot = slot
    biometric.fingerprint_enrollment_pending = False
    biometric.biometric_status = "active"
    db.commit()
    
    return {"success": True, "message": f"Fingerprint linked to slot {slot}"}
