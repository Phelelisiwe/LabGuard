from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attendance import Module
from app.schemas.module import ModuleCreate, ModuleResponse

router = APIRouter(
    prefix="/modules",
    tags=["Modules"]
)


@router.post("/create", response_model=ModuleResponse)
def create_module(
    module: ModuleCreate,
    db: Session = Depends(get_db)
):
    existing_module = db.query(Module).filter(
        Module.module_code == module.module_code
    ).first()

    if existing_module:
        raise HTTPException(
            status_code=400,
            detail="Module code already exists"
        )

    new_module = Module(
        module_code=module.module_code,
        module_name=module.module_name,
        lecturer_id=module.lecturer_id
    )

    db.add(new_module)
    db.commit()
    db.refresh(new_module)

    return new_module