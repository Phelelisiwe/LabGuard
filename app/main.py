from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.routers.student import router as student_router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.otp import router as otp_router
from app.routers.module import router as module_router
from app.routers.student_module import router as student_module_router
from app.routers.attendance import router as attendance_router
from app.routers.employee import router as employee_router


# Models must be imported before create_all
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
from app.routers.biometric import router as biometric_router
from app.routers import forgot_password
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="LabGuard API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://labguard-1-pwhe.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(otp_router)

app.include_router(admin_router)

app.include_router(student_router)
app.include_router(employee_router)

app.include_router(module_router)
app.include_router(student_module_router)
app.include_router(attendance_router)
app.include_router(biometric_router)
app.include_router(forgot_password.router)
@app.get("/")
def root():

    return {
        "success": True,
        "message": "LabGuard backend is running"
    }