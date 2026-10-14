
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.timetable import Timetable
from app.models.attendance import Module
from app.models.employee import Employee
from app.schemas.timetable import TimetableCreate, TimetableResponse
from app.auth_token import get_current_user


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/timetable",
    tags=["Timetable"],
)

VALID_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
]

LECTURER_ROLES = {
    "lecturer",
    "assistant lecturer",
}


def require_super_admin(current_user):
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the Super Admin can manage the full timetable.",
        )


def normalize_role(role):
    return str(role or "").strip().lower().replace("_", " ")


def get_timetable_entry(db, timetable_id):
    entry = (
        db.query(Timetable)
        .filter(Timetable.id == timetable_id)
        .first()
    )

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Timetable entry not found.",
        )

    return entry


def validate_lecturer(db, lecturer_id):
    lecturer = (
        db.query(Employee)
        .filter(Employee.id == lecturer_id)
        .first()
    )

    if lecturer is None:
        raise HTTPException(
            status_code=404,
            detail="Lecturer not found.",
        )

    if normalize_role(lecturer.role) not in LECTURER_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Selected employee must be a lecturer or assistant lecturer.",
        )

    return lecturer


def check_lecturer_overlap(
    db,
    lecturer_id,
    day_of_week,
    start_time,
    end_time,
    exclude_id=None,
):
    query = db.query(Timetable).filter(
        Timetable.lecturer_id == lecturer_id,
        Timetable.day_of_week == day_of_week,
        Timetable.active.is_(True),
        Timetable.start_time < end_time,
        Timetable.end_time > start_time,
    )

    if exclude_id is not None:
        query = query.filter(Timetable.id != exclude_id)

    if query.first():
        raise HTTPException(
            status_code=400,
            detail="This lecturer already has another class at this time.",
        )


def check_level_overlap(
    db,
    module,
    day_of_week,
    start_time,
    end_time,
):
    query = (
        db.query(Timetable)
        .join(Module, Timetable.module_id == Module.id)
        .filter(
            Module.level == module.level,
            Timetable.day_of_week == day_of_week,
            Timetable.active.is_(True),
            Timetable.start_time < end_time,
            Timetable.end_time > start_time,
        )
    )

    if query.first():
        raise HTTPException(
            status_code=400,
            detail="There is already a class scheduled for this level at that time.",
        )


def validate_schedule(day_of_week, start_time, end_time):
    if day_of_week not in VALID_DAYS:
        raise HTTPException(
            status_code=400,
            detail="Day must be Monday, Tuesday, Wednesday, Thursday, or Friday.",
        )

    if start_time >= end_time:
        raise HTTPException(
            status_code=400,
            detail="Start time must be before end time.",
        )


# CREATE TIMETABLE
@router.post("/", response_model=TimetableResponse)
def create_timetable(
    data: TimetableCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_super_admin(current_user)

    validate_schedule(
        data.day_of_week,
        data.start_time,
        data.end_time,
    )

    try:
        module = (
            db.query(Module)
            .filter(Module.id == data.module_id)
            .first()
        )

        if module is None:
            raise HTTPException(
                status_code=404,
                detail="Module not found.",
            )

        check_level_overlap(
            db,
            module,
            data.day_of_week,
            data.start_time,
            data.end_time,
        )

        if data.lecturer_id is not None:
            validate_lecturer(db, data.lecturer_id)

            check_lecturer_overlap(
                db,
                data.lecturer_id,
                data.day_of_week,
                data.start_time,
                data.end_time,
            )

        entry = Timetable(
            module_id=data.module_id,
            lecturer_id=data.lecturer_id,
            day_of_week=data.day_of_week,
            start_time=data.start_time,
            end_time=data.end_time,
            laboratory=data.laboratory,
            active=True,
        )

        db.add(entry)
        db.commit()
        db.refresh(entry)

        return entry

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error creating timetable entry")
        raise HTTPException(
            status_code=500,
            detail="Could not create timetable entry. Check the backend logs.",
        )


# GET ALL ACTIVE TIMETABLE ENTRIES
@router.get("/", response_model=list[TimetableResponse])
def get_timetable(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_super_admin(current_user)

    try:
        return (
            db.query(Timetable)
            .filter(Timetable.active.is_(True))
            .order_by(Timetable.day_of_week, Timetable.start_time)
            .all()
        )
    except SQLAlchemyError:
        logger.exception("Database error retrieving timetable")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve timetable. Check the backend logs.",
        )


# GET TIMETABLE BY MODULE LEVEL
@router.get("/level/{level}", response_model=list[TimetableResponse])
def get_timetable_by_level(
    level: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_super_admin(current_user)

    try:
        return (
            db.query(Timetable)
            .join(Module, Timetable.module_id == Module.id)
            .filter(
                Module.level == level,
                Timetable.active.is_(True),
            )
            .order_by(Timetable.day_of_week, Timetable.start_time)
            .all()
        )
    except SQLAlchemyError:
        logger.exception("Database error retrieving timetable by level")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve timetable for this level.",
        )


# GET A LECTURER'S TIMETABLE
@router.get(
    "/lecturer/{lecturer_id}",
    response_model=list[TimetableResponse],
)
def get_lecturer_timetable(
    lecturer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_super_admin(current_user)

    try:
        validate_lecturer(db, lecturer_id)

        return (
            db.query(Timetable)
            .filter(
                Timetable.lecturer_id == lecturer_id,
                Timetable.active.is_(True),
            )
            .order_by(Timetable.day_of_week, Timetable.start_time)
            .all()
        )
    except HTTPException:
        raise
    except SQLAlchemyError:
        logger.exception("Database error retrieving lecturer timetable")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve lecturer timetable.",
        )


# GET TODAY'S TIMETABLE
@router.get("/current", response_model=list[TimetableResponse])
def get_current_timetable(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_super_admin(current_user)

    today = datetime.now().strftime("%A")

    if today not in VALID_DAYS:
        return []

    try:
        return (
            db.query(Timetable)
            .filter(
                Timetable.day_of_week == today,
                Timetable.active.is_(True),
            )
            .order_by(Timetable.start_time)
            .all()
        )
    except SQLAlchemyError:
        logger.exception("Database error retrieving current timetable")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve today's timetable.",
        )


# ASSIGN A LECTURER
@router.put(
    "/{timetable_id}/assign-lecturer",
    response_model=TimetableResponse,
)
def assign_lecturer(
    timetable_id: int,
    lecturer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_super_admin(current_user)

    try:
        entry = get_timetable_entry(db, timetable_id)

        if not entry.active:
            raise HTTPException(
                status_code=400,
                detail="Cannot assign a lecturer to an inactive timetable entry.",
            )

        validate_lecturer(db, lecturer_id)

        check_lecturer_overlap(
            db,
            lecturer_id,
            entry.day_of_week,
            entry.start_time,
            entry.end_time,
            exclude_id=entry.id,
        )

        entry.lecturer_id = lecturer_id
        db.commit()
        db.refresh(entry)

        return entry

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error assigning lecturer")
        raise HTTPException(
            status_code=500,
            detail="Could not assign lecturer. Check the backend logs.",
        )


# REMOVE A LECTURER ASSIGNMENT
@router.put(
    "/{timetable_id}/unassign-lecturer",
    response_model=TimetableResponse,
)
def unassign_lecturer(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_super_admin(current_user)

    try:
        entry = get_timetable_entry(db, timetable_id)
        entry.lecturer_id = None

        db.commit()
        db.refresh(entry)

        return entry

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error removing lecturer assignment")
        raise HTTPException(
            status_code=500,
            detail="Could not remove lecturer assignment. Check the backend logs.",
        )
