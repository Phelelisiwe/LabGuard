from pydantic import BaseModel


class ModuleCreate(BaseModel):
    module_code: str
    module_name: str
    lecturer_id: int


class ModuleResponse(BaseModel):
    id: int
    module_code: str
    module_name: str
    lecturer_id: int

    class Config:
        from_attributes = True