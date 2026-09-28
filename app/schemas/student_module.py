from pydantic import BaseModel


class StudentModuleCreate(BaseModel):
    student_id: int
    module_id: int


class StudentModuleResponse(BaseModel):
    id: int
    student_id: int
    module_id: int

    class Config:
        from_attributes = True