from datetime import time

# Import all related models before SQLAlchemy initializes relationships
from app.models.employee import Employee
from app.models.attendance import Module
from app.models.attendance_session import AttendanceSession
from app.models.timetable import Timetable

from app.database import SessionLocal
# ---------------------------------------------------------
# LABGUARD TIMETABLE SEED DATA
# ---------------------------------------------------------

SCHEDULE = [

    # =====================================================
    # LEVEL 1
    # =====================================================

    # Monday
    (2, "Monday", "08:00", "10:00", "Computer Systems Lab"),
    (3, "Monday", "10:15", "12:15", "Computer Systems Lab"),
    (4, "Monday", "13:00", "15:00", "Computer Systems Lab"),

    # Tuesday
    (3, "Tuesday", "08:00", "10:00", "Computer Systems Lab"),
    (5, "Tuesday", "10:15", "12:15", "Electronics Lab"),
    (2, "Tuesday", "13:00", "15:00", "Computer Systems Lab"),
    (4, "Tuesday", "15:15", "17:15", "Computer Systems Lab"),

    # Wednesday
    (5, "Wednesday", "08:00", "10:00", "Electronics Lab"),
    (2, "Wednesday", "10:15", "12:15", "Computer Systems Lab"),
    (3, "Wednesday", "13:00", "15:00", "Computer Systems Lab"),

    # Thursday
    (4, "Thursday", "08:00", "10:00", "Computer Systems Lab"),
    (3, "Thursday", "10:15", "12:15", "Computer Systems Lab"),
    (5, "Thursday", "13:00", "15:00", "Electronics Lab"),
    (2, "Thursday", "15:15", "17:15", "Computer Systems Lab"),

    # Friday
    (2, "Friday", "08:00", "10:00", "Computer Systems Lab"),
    (4, "Friday", "10:15", "12:15", "Computer Systems Lab"),
    (3, "Friday", "13:00", "15:00", "Computer Systems Lab"),
    (5, "Friday", "15:15", "17:15", "Electronics Lab"),


    # =====================================================
    # LEVEL 2
    # =====================================================

    # Monday
    (6, "Monday", "08:00", "10:00", "Computer Systems Lab"),
    (7, "Monday", "10:15", "12:15", "Computer Systems Lab"),
    (8, "Monday", "13:00", "15:00", "Network Lab"),
    (9, "Monday", "15:15", "17:15", "Electronics Lab"),

    # Tuesday
    (7, "Tuesday", "08:00", "10:00", "Computer Systems Lab"),
    (8, "Tuesday", "10:15", "12:15", "Network Lab"),
    (9, "Tuesday", "13:00", "15:00", "Electronics Lab"),
    (11, "Tuesday", "15:15", "17:15", "Computer Systems Lab"),

    # Wednesday
    (8, "Wednesday", "08:00", "10:00", "Network Lab"),
    (9, "Wednesday", "10:15", "12:15", "Electronics Lab"),
    (10, "Wednesday", "13:00", "15:00", "Electronics Lab"),
    (7, "Wednesday", "15:15", "17:15", "Computer Systems Lab"),

    # Thursday
    (9, "Thursday", "08:00", "10:00", "Electronics Lab"),
    (11, "Thursday", "10:15", "12:15", "Computer Systems Lab"),
    (6, "Thursday", "13:00", "15:00", "Computer Systems Lab"),
    (10, "Thursday", "15:15", "17:15", "Electronics Lab"),

    # Friday
    (10, "Friday", "08:00", "10:00", "Electronics Lab"),
    (6, "Friday", "10:15", "12:15", "Computer Systems Lab"),
    (7, "Friday", "13:00", "15:00", "Computer Systems Lab"),
    (11, "Friday", "15:15", "17:15", "Computer Systems Lab"),


    # =====================================================
    # LEVEL 3
    # =====================================================

    # Monday
    (12, "Monday", "08:00", "10:00", "Computer Systems Lab"),
    (13, "Monday", "10:15", "12:15", "Computer Systems Lab"),
    (14, "Monday", "13:00", "15:00", "Computer Systems Lab"),
    (15, "Monday", "15:15", "17:15", "Electronics Lab"),

    # Tuesday
    (13, "Tuesday", "08:00", "10:00", "Computer Systems Lab"),
    (14, "Tuesday", "10:15", "12:15", "Computer Systems Lab"),
    (15, "Tuesday", "13:00", "15:00", "Electronics Lab"),
    (16, "Tuesday", "15:15", "17:15", "Computer Systems Lab"),

    # Wednesday
    (14, "Wednesday", "08:00", "10:00", "Computer Systems Lab"),
    (15, "Wednesday", "10:15", "12:15", "Electronics Lab"),
    (16, "Wednesday", "13:00", "15:00", "Computer Systems Lab"),
    (13, "Wednesday", "15:15", "17:15", "Computer Systems Lab"),

    # Thursday
    (15, "Thursday", "08:00", "10:00", "Electronics Lab"),
    (16, "Thursday", "10:15", "12:15", "Computer Systems Lab"),
    (1, "Thursday", "13:00", "15:00", "Computer Systems Lab"),
    (12, "Thursday", "15:15", "17:15", "Computer Systems Lab"),

    # Friday
    (16, "Friday", "08:00", "10:00", "Computer Systems Lab"),
    (1, "Friday", "10:15", "12:15", "Computer Systems Lab"),
    (12, "Friday", "13:00", "15:00", "Computer Systems Lab"),
    (14, "Friday", "15:15", "17:15", "Computer Systems Lab"),
]


# ---------------------------------------------------------
# SEED FUNCTION
# ---------------------------------------------------------

def seed_timetable():

    db = SessionLocal()

    try:

        created = 0
        skipped = 0

        for module_id, day, start, end, laboratory in SCHEDULE:

            # ---------------------------------------------
            # Check that module exists
            # ---------------------------------------------

            module = db.query(Module).filter(
                Module.id == module_id
            ).first()

            if not module:
                print(
                    f"SKIPPED: Module ID {module_id} "
                    f"does not exist."
                )
                skipped += 1
                continue

            # ---------------------------------------------
            # Convert time strings to Python time objects
            # ---------------------------------------------

            start_time = time.fromisoformat(start)
            end_time = time.fromisoformat(end)

            # ---------------------------------------------
            # Check if timetable entry already exists
            # ---------------------------------------------

            existing = db.query(Timetable).filter(
                Timetable.module_id == module_id,
                Timetable.day_of_week == day,
                Timetable.start_time == start_time,
                Timetable.end_time == end_time,
                Timetable.active == True
            ).first()

            if existing:

                print(
                    f"SKIPPED: {module.module_code} "
                    f"{day} {start}-{end}"
                )

                skipped += 1
                continue

            # ---------------------------------------------
            # Create timetable entry
            # ---------------------------------------------

            timetable = Timetable(
                module_id=module_id,
                lecturer_id=None,
                day_of_week=day,
                start_time=start_time,
                end_time=end_time,
                laboratory=laboratory,
                active=True
            )

            db.add(timetable)

            print(
                f"ADDED: {module.module_code} "
                f"{day} {start}-{end} "
                f"{laboratory}"
            )

            created += 1

        # ---------------------------------------------
        # Save changes
        # ---------------------------------------------

        db.commit()

        print()
        print("=" * 60)
        print("TIMETABLE SEED COMPLETED")
        print("=" * 60)
        print(f"Created : {created}")
        print(f"Skipped : {skipped}")
        print(f"Total   : {len(SCHEDULE)}")
        print("=" * 60)

    except Exception as e:

        db.rollback()

        print()
        print("ERROR WHILE SEEDING TIMETABLE")
        print(e)

    finally:

        db.close()


# ---------------------------------------------------------
# RUN
# ---------------------------------------------------------

if __name__ == "__main__":
    seed_timetable()