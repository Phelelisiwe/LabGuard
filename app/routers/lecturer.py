import csv
from io import StringIO
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.attendance import Module, StudentModule, Attendance
from app.models.student import Student


router = APIRouter(
    prefix="/lecturer",
    tags=["Lecturer"]
)


# ============================================================
# HELPER: CHECK LECTURER ACCESS TO MODULE
# ============================================================

def get_lecturer_module(
    module_id: int,
    lecturer_id: int,
    db: Session
):
    module = (
        db.query(Module)
        .filter(
            Module.id == module_id,
            Module.lecturer_id == lecturer_id
        )
        .first()
    )

    if not module:
        raise HTTPException(
            status_code=404,
            detail="Module not found or not assigned to this lecturer"
        )

    return module


# ============================================================
# 1. VIEW ALL MODULES ASSIGNED TO LECTURER
# ============================================================

@router.get("/modules")
def get_my_modules(
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):
    """
    Return all modules assigned to the logged-in lecturer.
    """

    lecturer_id = current_user["user_id"]

    modules = (
        db.query(Module)
        .filter(Module.lecturer_id == lecturer_id)
        .order_by(Module.module_code)
        .all()
    )

    return [
        {
            "id": module.id,
            "module_code": module.module_code,
            "module_name": module.module_name,
            "level": module.level
        }
        for module in modules
    ]


# ============================================================
# 2. VIEW STUDENTS REGISTERED FOR A MODULE
# ============================================================

@router.get("/modules/{module_id}/students")
def get_module_students(
    module_id: int,
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):
    """
    Return all students registered for a lecturer's module.
    """

    lecturer_id = current_user["user_id"]

    module = get_lecturer_module(
        module_id,
        lecturer_id,
        db
    )

    students = (
        db.query(Student)
        .join(
            StudentModule,
            Student.id == StudentModule.student_id
        )
        .filter(
            StudentModule.module_id == module.id
        )
        .order_by(
            Student.student_number
        )
        .all()
    )

    return {
        "module": {
            "id": module.id,
            "module_code": module.module_code,
            "module_name": module.module_name
        },
        "students": [
            {
                "id": student.id,
                "student_number": student.student_number,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "course": student.course,
                "current_year": student.current_year,
                "email": student.email
            }
            for student in students
        ],
        "total_students": len(students)
    }


# ============================================================
# 3. VIEW ALL ATTENDANCE RECORDS FOR A MODULE
# ============================================================

@router.get("/modules/{module_id}/attendance")
def get_module_attendance(
    module_id: int,
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):
    """
    Return all attendance records for a lecturer's module.
    """

    lecturer_id = current_user["user_id"]

    module = get_lecturer_module(
        module_id,
        lecturer_id,
        db
    )

    records = (
        db.query(
            Attendance,
            Student
        )
        .join(
            Student,
            Attendance.student_id == Student.id
        )
        .filter(
            Attendance.module_id == module.id
        )
        .order_by(
            Attendance.date.desc(),
            Attendance.time_in.desc()
        )
        .all()
    )

    return {
        "module": {
            "id": module.id,
            "module_code": module.module_code,
            "module_name": module.module_name
        },
        "attendance": [
            {
                "attendance_id": attendance.id,
                "student_id": student.id,
                "student_number": student.student_number,
                "student_name": (
                    f"{student.first_name} {student.last_name}"
                ),
                "date": attendance.date.isoformat(),
                "time_in": (
                    attendance.time_in.isoformat()
                    if attendance.time_in
                    else None
                ),
                "time_out": (
                    attendance.time_out.isoformat()
                    if attendance.time_out
                    else None
                ),
                "status": "Present"
            }
            for attendance, student in records
        ],
        "total_records": len(records)
    }


# ============================================================
# 4. OVERALL ATTENDANCE FOR A MODULE
# ============================================================

@router.get("/modules/{module_id}/attendance/overall")
def get_overall_attendance(
    module_id: int,
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):
    """
    Calculate overall attendance statistics for a module.
    """

    lecturer_id = current_user["user_id"]

    module = get_lecturer_module(
        module_id,
        lecturer_id,
        db
    )

    # --------------------------------------------------------
    # Registered students
    # --------------------------------------------------------

    total_students = (
        db.query(StudentModule)
        .filter(
            StudentModule.module_id == module.id
        )
        .count()
    )

    # --------------------------------------------------------
    # Class dates
    #
    # A class date is a date on which attendance was recorded.
    # --------------------------------------------------------

    class_dates = (
        db.query(Attendance.date)
        .filter(
            Attendance.module_id == module.id
        )
        .distinct()
        .all()
    )

    class_dates = [row[0] for row in class_dates]

    classes_held = len(class_dates)

    # --------------------------------------------------------
    # Attendance records
    # --------------------------------------------------------

    total_present = (
        db.query(Attendance)
        .filter(
            Attendance.module_id == module.id
        )
        .count()
    )

    # --------------------------------------------------------
    # Calculate overall percentage
    # --------------------------------------------------------

    possible_attendance = (
        total_students * classes_held
    )

    if possible_attendance > 0:
        attendance_rate = (
            total_present / possible_attendance
        ) * 100
    else:
        attendance_rate = 0.0

    # --------------------------------------------------------
    # Individual student attendance
    # --------------------------------------------------------

    students = (
        db.query(Student)
        .join(
            StudentModule,
            Student.id == StudentModule.student_id
        )
        .filter(
            StudentModule.module_id == module.id
        )
        .order_by(Student.student_number)
        .all()
    )

    student_statistics = []

    for student in students:

        attended = (
            db.query(Attendance)
            .filter(
                Attendance.module_id == module.id,
                Attendance.student_id == student.id
            )
            .count()
        )

        if classes_held > 0:
            student_rate = (
                attended / classes_held
            ) * 100
        else:
            student_rate = 0.0

        student_statistics.append(
            {
                "student_id": student.id,
                "student_number": student.student_number,
                "student_name": (
                    f"{student.first_name} {student.last_name}"
                ),
                "classes_attended": attended,
                "classes_missed": max(
                    classes_held - attended,
                    0
                ),
                "attendance_rate": round(
                    student_rate,
                    2
                )
            }
        )

    return {
        "module": {
            "id": module.id,
            "module_code": module.module_code,
            "module_name": module.module_name
        },
        "total_students": total_students,
        "classes_held": classes_held,
        "total_present_records": total_present,
        "possible_attendance_records": possible_attendance,
        "overall_attendance_rate": round(
            attendance_rate,
            2
        ),
        "students": student_statistics
    }


# ============================================================
# 5. DOWNLOAD ATTENDANCE FOR A SPECIFIC MODULE
# ============================================================

@router.get("/modules/{module_id}/attendance/download")
def download_module_attendance(
    module_id: int,
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):
    """
    Download attendance records for a specific module as CSV.
    """

    lecturer_id = current_user["user_id"]

    module = get_lecturer_module(
        module_id,
        lecturer_id,
        db
    )

    records = (
        db.query(
            Attendance,
            Student
        )
        .join(
            Student,
            Attendance.student_id == Student.id
        )
        .filter(
            Attendance.module_id == module.id
        )
        .order_by(
            Attendance.date.asc(),
            Student.student_number.asc()
        )
        .all()
    )

    output = StringIO()

    writer = csv.writer(output)

    writer.writerow([
        "Module Code",
        "Module Name",
        "Student Number",
        "Student Name",
        "Date",
        "Time In",
        "Time Out",
        "Status"
    ])

    for attendance, student in records:

        writer.writerow([
            module.module_code,
            module.module_name,
            student.student_number,
            f"{student.first_name} {student.last_name}",
            attendance.date.isoformat(),
            (
                attendance.time_in.isoformat()
                if attendance.time_in
                else ""
            ),
            (
                attendance.time_out.isoformat()
                if attendance.time_out
                else ""
            ),
            "Present"
        ])

    output.seek(0)

    filename = (
        f"{module.module_code}_attendance.csv"
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        }
    )


# ============================================================
# 6. PREDICT NEXT ATTENDANCE RATE
# ============================================================

@router.get("/modules/{module_id}/attendance/prediction")
def predict_next_attendance(
    module_id: int,
    current_user=Depends(require_role("lecturer")),
    db: Session = Depends(get_db)
):
    """
    Predict the next attendance rate using recent class attendance.

    The prediction uses the average attendance rate of the
    most recent five class dates.
    """

    lecturer_id = current_user["user_id"]

    module = get_lecturer_module(
        module_id,
        lecturer_id,
        db
    )

    # --------------------------------------------------------
    # Registered students
    # --------------------------------------------------------

    total_students = (
        db.query(StudentModule)
        .filter(
            StudentModule.module_id == module.id
        )
        .count()
    )

    if total_students == 0:
        return {
            "module": {
                "id": module.id,
                "module_code": module.module_code,
                "module_name": module.module_name
            },
            "prediction": None,
            "message": "No students are registered for this module."
        }

    # --------------------------------------------------------
    # Get class dates
    # --------------------------------------------------------

    class_dates = (
        db.query(Attendance.date)
        .filter(
            Attendance.module_id == module.id
        )
        .distinct()
        .order_by(
            Attendance.date.desc()
        )
        .limit(5)
        .all()
    )

    class_dates = [row[0] for row in class_dates]

    if not class_dates:
        return {
            "module": {
                "id": module.id,
                "module_code": module.module_code,
                "module_name": module.module_name
            },
            "prediction": None,
            "message": (
                "There is not enough attendance history "
                "to make a prediction."
            )
        }

    # --------------------------------------------------------
    # Calculate attendance rate for each recent class
    # --------------------------------------------------------

    daily_rates = []

    for class_date in class_dates:

        present_count = (
            db.query(Attendance)
            .filter(
                Attendance.module_id == module.id,
                Attendance.date == class_date
            )
            .count()
        )

        daily_rate = (
            present_count / total_students
        ) * 100

        daily_rates.append(daily_rate)

    # --------------------------------------------------------
    # Simple prediction
    #
    # Average of the most recent five class attendance rates.
    # --------------------------------------------------------

    predicted_rate = (
        sum(daily_rates) / len(daily_rates)
    )

    predicted_rate = max(
        0,
        min(100, predicted_rate)
    )

    return {
        "module": {
            "id": module.id,
            "module_code": module.module_code,
            "module_name": module.module_name
        },
        "classes_used": len(daily_rates),
        "recent_attendance_rates": [
            round(rate, 2)
            for rate in daily_rates
        ],
        "predicted_next_attendance_rate": round(
            predicted_rate,
            2
        ),
        "prediction_method": (
            "Average attendance rate of the "
            "most recent five recorded classes"
        )
    }