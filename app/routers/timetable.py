
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


# ---------------------------------------------------------
# AUTHORIZATION AND VALIDATION HELPERS
# ---------------------------------------------------------

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


def get_module(db, module_id, lock=False):
    query = db.query(Module).filter(Module.id == module_id)

    if lock:
        query = query.with_for_update()

    module = query.first()

    if module is None:
        raise HTTPException(
            status_code=404,
            detail="Module not found.",
        )

    return module


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
            detail=(
                "Selected employee must be a lecturer "
                "or assistant lecturer."
            ),
        )

    return lecturer


def validate_schedule(day_of_week, start_time, end_time):
    if day_of_week not in VALID_DAYS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Day must be Monday, Tuesday, Wednesday, "
                "Thursday, or Friday."
            ),
        )

    if start_time >= end_time:
        raise HTTPException(
            status_code=400,
            detail="Start time must be before end time.",
        )


def check_lecturer_overlap(
    db,
    lecturer_id,
    day_of_week,
    start_time,
    end_time,
    exclude_id=None,
    exclude_module_id=None,
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

    if exclude_module_id is not None:
        query = query.filter(
            Timetable.module_id != exclude_module_id
        )

    conflict = query.first()

    if conflict:
        raise HTTPException(
            status_code=409,
            detail=(
                f"The lecturer has a conflicting class on "
                f"{day_of_week}, "
                f"{conflict.start_time.strftime('%H:%M')}-"
                f"{conflict.end_time.strftime('%H:%M')}."
            ),
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
            status_code=409,
            detail=(
                "There is already a class scheduled "
                "for this level at that time."
            ),
        )


# ---------------------------------------------------------
# CENTRAL MODULE ASSIGNMENT LOGIC
# ---------------------------------------------------------

def assign_module_lecturer(db, module_id, lecturer_id):
    """
    Assign one lecturer to a module and all its active
    timetable sessions.

    The caller is responsible for committing or rolling back.
    """
    module = get_module(db, module_id, lock=True)
    lecturer = validate_lecturer(db, lecturer_id)

    entries = (
        db.query(Timetable)
        .filter(
            Timetable.module_id == module_id,
            Timetable.active.is_(True),
        )
        .order_by(
            Timetable.day_of_week,
            Timetable.start_time,
        )
        .with_for_update()
        .all()
    )

    if not entries:
        raise HTTPException(
            status_code=404,
            detail=(
                "No active timetable sessions exist for this module. "
                "Create the weekly timetable before assigning a lecturer."
            ),
        )

    # Protect an existing assignment from accidental overwriting.
    if (
        module.lecturer_id is not None
        and module.lecturer_id != lecturer.id
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This module already has a different lecturer assigned. "
                "Remove the existing module assignment first."
            ),
        )

    if any(
        entry.lecturer_id is not None
        and entry.lecturer_id != lecturer.id
        for entry in entries
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "One or more timetable sessions have a different lecturer. "
                "Review or remove the existing assignment first."
            ),
        )

    # Validate every session before changing any records.
    for entry in entries:
        check_lecturer_overlap(
            db,
            lecturer.id,
            entry.day_of_week,
            entry.start_time,
            entry.end_time,
            exclude_module_id=module_id,
        )

    # Save the assignment on the module record.
    module.lecturer_id = lecturer.id

    # Save the same lecturer on every active weekly session.
    for entry in entries:
        entry.lecturer_id = lecturer.id

    logger.info(
        "Prepared lecturer assignment: employee_id=%s, "
        "module_id=%s, active_sessions=%s",
        lecturer.id,
        module.id,
        len(entries),
    )

    return entries


def unassign_module_lecturer(db, module_id):
    """
    Remove the lecturer assignment from the module and
    all its active timetable sessions.
    """
    module = get_module(db, module_id, lock=True)

    entries = (
        db.query(Timetable)
        .filter(
            Timetable.module_id == module_id,
            Timetable.active.is_(True),
        )
        .with_for_update()
        .all()
    )

    module.lecturer_id = None

    for entry in entries:
        entry.lecturer_id = None

    return entries


# ---------------------------------------------------------
# CREATE TIMETABLE ENTRY
# ---------------------------------------------------------

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
        module = get_module(db, data.module_id, lock=True)

        # If the module already has a lecturer, new sessions
        # inherit that lecturer automatically.
        assigned_lecturer_id = module.lecturer_id

        if data.lecturer_id is not None:
            validate_lecturer(db, data.lecturer_id)

            if (
                assigned_lecturer_id is not None
                and assigned_lecturer_id != data.lecturer_id
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "The selected lecturer differs from the "
                        "module's existing lecturer assignment."
                    ),
                )

            assigned_lecturer_id = data.lecturer_id

        check_level_overlap(
            db,
            module,
            data.day_of_week,
            data.start_time,
            data.end_time,
        )

        if assigned_lecturer_id is not None:
            check_lecturer_overlap(
                db,
                assigned_lecturer_id,
                data.day_of_week,
                data.start_time,
                data.end_time,
            )

            # Keep the module record consistent if a lecturer
            # was provided while creating this timetable entry.
            module.lecturer_id = assigned_lecturer_id

        entry = Timetable(
            module_id=data.module_id,
            lecturer_id=assigned_lecturer_id,
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
            detail=(
                "Could not create timetable entry. "
                "Check the backend logs."
            ),
        )


# ---------------------------------------------------------
# GET ALL ACTIVE TIMETABLE ENTRIES
# ---------------------------------------------------------

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
            .order_by(
                Timetable.day_of_week,
                Timetable.start_time,
            )
            .all()
        )

    except SQLAlchemyError:
        logger.exception("Database error retrieving timetable")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve timetable.",
        )


# ---------------------------------------------------------
# GET TIMETABLE BY MODULE LEVEL
# ---------------------------------------------------------

@router.get(
    "/level/{level}",
    response_model=list[TimetableResponse],
)
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
            .order_by(
                Timetable.day_of_week,
                Timetable.start_time,
            )
            .all()
        )

    except SQLAlchemyError:
        logger.exception(
            "Database error retrieving timetable by level"
        )
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve timetable for this level.",
        )


# ---------------------------------------------------------
# GET A LECTURER'S TIMETABLE
# ---------------------------------------------------------

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
            .order_by(
                Timetable.day_of_week,
                Timetable.start_time,
            )
            .all()
        )

    except HTTPException:
        raise

    except SQLAlchemyError:
        logger.exception(
            "Database error retrieving lecturer timetable"
        )
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve lecturer timetable.",
        )


# ---------------------------------------------------------
# GET TODAY'S TIMETABLE
# ---------------------------------------------------------

@router.get(
    "/current",
    response_model=list[TimetableResponse],
)
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
        logger.exception(
            "Database error retrieving current timetable"
        )
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve today's timetable.",
        )


# ---------------------------------------------------------
# ASSIGN A LECTURER TO A MODULE AND ALL ACTIVE SESSIONS
# ---------------------------------------------------------

@router.put(
    "/module/{module_id}/assign-lecturer",
    response_model=list[TimetableResponse],
)
def assign_lecturer_to_module(
    module_id: int,
    lecturer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_super_admin(current_user)

    try:
        entries = assign_module_lecturer(
            db,
            module_id,
            lecturer_id,
        )

        # The module and all sessions are committed together.
        db.commit()

        for entry in entries:
            db.refresh(entry)

        logger.info(
            "Successfully assigned lecturer_id=%s to module_id=%s "
            "across %s active sessions",
            lecturer_id,
            module_id,
            len(entries),
        )

        return entries

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Database error assigning lecturer to module"
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Could not assign lecturer to the module. "
                "Check the backend logs."
            ),
        )


# ---------------------------------------------------------
# ASSIGN A LECTURER USING A TIMETABLE ENTRY ID
# This also maintains the whole-module assignment.
# ---------------------------------------------------------

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
                detail=(
                    "Cannot assign a lecturer through an "
                    "inactive timetable entry."
                ),
            )

        entries = assign_module_lecturer(
            db,
            entry.module_id,
            lecturer_id,
        )

        db.commit()

        for session in entries:
            db.refresh(session)

        return next(
            session for session in entries
            if session.id == timetable_id
        )

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Database error assigning lecturer through timetable entry"
        )
        raise HTTPException(
            status_code=500,
            detail="Could not assign lecturer. Check the backend logs.",
        )


# ---------------------------------------------------------
# REMOVE A LECTURER ASSIGNMENT
# This removes the module assignment from all active sessions.
# ---------------------------------------------------------

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
        module_id = entry.module_id

        entries = unassign_module_lecturer(db, module_id)

        db.commit()

        for session in entries:
            db.refresh(session)

        # Return the requested timetable entry when it is active.
        # If it is inactive, return the original entry after clearing
        # its lecturer assignment as well.
        if not entry.active:
            entry.lecturer_id = None
            db.refresh(entry)

        return entry

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Database error removing module lecturer assignment"
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Could not remove lecturer assignment. "
                "Check the backend logs."
            ),
        )
