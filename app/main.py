from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from app.routers.student import router as student_router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.otp import router as otp_router
from app.database import Base, engine
from app.models.admin import SuperAdmin
from app.models.otp import OTP
Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="LabGuard API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(student_router)
app.include_router(admin_router)
app.include_router(otp_router)
app.include_router(auth_router)
@app.get("/")
def root():
    return {
        "success": True,
        "message": "LabGuard backend is running"
    }