from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# =========================================================
# DATABASE
# =========================================================

from app.database import Base, engine


# =========================================================
# MODELS
# =========================================================

from app.models.admin import SuperAdmin
from app.models.otp import OTP
from app.models.student import Student
from app.models.employee import Employee

from app.models.attendance import (
    Module,
    StudentModule,
    Attendance
)

from app.models.biometric import StudentBiometric

from app.models.timetable import Timetable

from app.models.attendance_session import AttendanceSession


# =========================================================
# ROUTERS
# =========================================================

from app.routers.student import router as student_router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.otp import router as otp_router

from app.routers.module import router as module_router
from app.routers.student_module import (
    router as student_module_router
)

from app.routers.attendance import (
    router as attendance_router
)

from app.routers.employee import (
    router as employee_router
)

from app.routers.lecturer import (
    router as lecturer_router
)

from app.routers.biometric import (
    router as biometric_router
)

from app.routers.timetable import (
    router as timetable_router
)

from app.routers.attendance_session import (
    router as attendance_session_router
)

from app.routers import forgot_password


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="LabGuard API",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://localhost(:\d+)?|https?://127\.0\.0\.1(:\d+)?",
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://labguard-1-pwhe.onrender.com",
        "https://labguard-dklp.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(otp_router)

app.include_router(admin_router)

app.include_router(student_router)

app.include_router(employee_router)

app.include_router(lecturer_router)

app.include_router(module_router)

app.include_router(student_module_router)

app.include_router(attendance_router)

app.include_router(timetable_router)

app.include_router(attendance_session_router)

app.include_router(biometric_router)

app.include_router(forgot_password.router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "LabGuard backend is running"
    }