from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.timetable import Timetable
from app.models.attendance import Module
from app.models.employee import Employee
from app.schemas.timetable import (
    TimetableCreate,
    TimetableResponse
)

# Change this import if your admin dependency has a different name.
from app.auth_token import get_current_user


router = APIRouter(
    prefix="/timetable",
    tags=["Timetable"]
)


# =========================================================
# CREATE TIMETABLE
# =========================================================

@router.post("/", response_model=TimetableResponse)
def create_timetable(
    data: TimetableCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the Super Admin can create timetable entries."
        )

    module = db.query(Module).filter(
        Module.id == data.module_id
    ).first()

    if not module:
        raise HTTPException(
            status_code=404,
            detail="Module not found."
        )

    if data.day_of_week not in [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid day of week."
        )

    if data.start_time >= data.end_time:
        raise HTTPException(
            status_code=400,
            detail="Start time must be before end time."
        )

    # Check module overlap for the same level
    module_overlap = (
        db.query(Timetable)
        .join(Module)
        .filter(
            Module.level == module.level,
            Timetable.day_of_week == data.day_of_week,
            Timetable.active == True,
            Timetable.start_time < data.end_time,
            Timetable.end_time > data.start_time
        )
        .first()
    )

    if module_overlap:
        raise HTTPException(
            status_code=400,
            detail="There is already a class scheduled for this level at that time."
        )

    # Optional lecturer assignment
    if data.lecturer_id is not None:

        lecturer = db.query(Employee).filter(
            Employee.id == data.lecturer_id
        ).first()

        if not lecturer:
            raise HTTPException(
                status_code=404,
                detail="Lecturer not found."
            )

        if lecturer.role not in [
            "lecturer",
            "assistant lecturer"
        ]:
            raise HTTPException(
                status_code=400,
                detail="Selected employee is not a lecturer."
            )

        lecturer_overlap = db.query(Timetable).filter(
            Timetable.lecturer_id == data.lecturer_id,
            Timetable.day_of_week == data.day_of_week,
            Timetable.active == True,
            Timetable.start_time < data.end_time,
            Timetable.end_time > data.start_time
        ).first()

        if lecturer_overlap:
            raise HTTPException(
                status_code=400,
                detail="This lecturer already has a class at this time."
            )

    timetable = Timetable(
        module_id=data.module_id,
        lecturer_id=data.lecturer_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        laboratory=data.laboratory,
        active=True
    )

    db.add(timetable)
    db.commit()
    db.refresh(timetable)

    return timetable


# =========================================================
# GET ALL TIMETABLE
# =========================================================

@router.get("/", response_model=list[TimetableResponse])
def get_timetable(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the Super Admin can view the full timetable."
        )

    return (
        db.query(Timetable)
        .filter(Timetable.active == True)
        .order_by(
            Timetable.day_of_week,
            Timetable.start_time
        )
        .all()
    )


# =========================================================
# GET TIMETABLE BY LEVEL
# =========================================================

@router.get("/level/{level}", response_model=list[TimetableResponse])
def get_timetable_by_level(
    level: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the Super Admin can view timetable levels."
        )

    return (
        db.query(Timetable)
        .join(Module)
        .filter(
            Module.level == level,
            Timetable.active == True
        )
        .order_by(
            Timetable.day_of_week,
            Timetable.start_time
        )
        .all()
    )


# =========================================================
# GET LECTURER TIMETABLE
# =========================================================

@router.get("/lecturer/{lecturer_id}", response_model=list[TimetableResponse])
def get_lecturer_timetable(
    lecturer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the Super Admin can view lecturer timetables."
        )

    lecturer = db.query(Employee).filter(
        Employee.id == lecturer_id
    ).first()

    if not lecturer:
        raise HTTPException(
            status_code=404,
            detail="Lecturer not found."
        )

    return (
        db.query(Timetable)
        .filter(
            Timetable.lecturer_id == lecturer_id,
            Timetable.active == True
        )
        .order_by(
            Timetable.day_of_week,
            Timetable.start_time
        )
        .all()
    )


# =========================================================
# ASSIGN LECTURER
# =========================================================

@router.put(
    "/{timetable_id}/assign-lecturer",
    response_model=TimetableResponse
)
def assign_lecturer(
    timetable_id: int,
    lecturer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    # Only Super Admin
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the Super Admin can assign lecturers."
        )

    # Find timetable
    timetable = db.query(Timetable).filter(
        Timetable.id == timetable_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="Timetable entry not found."
        )

    # Find lecturer
    lecturer = db.query(Employee).filter(
        Employee.id == lecturer_id
    ).first()

    if not lecturer:
        raise HTTPException(
            status_code=404,
            detail="Lecturer not found."
        )

    # Make sure employee is actually a lecturer
    if lecturer.role not in [
        "lecturer",
        "assistant lecturer"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Selected employee is not a lecturer."
        )

    # Make sure lecturer is not already teaching
    # another class at the same time.
    overlap = db.query(Timetable).filter(
        Timetable.id != timetable_id,
        Timetable.lecturer_id == lecturer_id,
        Timetable.day_of_week == timetable.day_of_week,
        Timetable.active == True,
        Timetable.start_time < timetable.end_time,
        Timetable.end_time > timetable.start_time
    ).first()

    if overlap:
        raise HTTPException(
            status_code=400,
            detail="This lecturer already has another class at this time."
        )

    timetable.lecturer_id = lecturer_id

    db.commit()
    db.refresh(timetable)

    return timetable


# =========================================================
# UNASSIGN LECTURER
# =========================================================

@router.put(
    "/{timetable_id}/unassign-lecturer",
    response_model=TimetableResponse
)
def unassign_lecturer(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the Super Admin can remove lecturer assignments."
        )

    timetable = db.query(Timetable).filter(
        Timetable.id == timetable_id
    ).first()

    if not timetable:
        raise HTTPException(
            status_code=404,
            detail="Timetable entry not found."
        )

    timetable.lecturer_id = None

    db.commit()
    db.refresh(timetable)

    return timetable