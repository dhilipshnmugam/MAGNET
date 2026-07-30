from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    code: str = Field(..., min_length=1, max_length=20)
    department_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: str = Field(default="active", pattern=r"^(active|inactive)$")

    hod_email: EmailStr
    hod_password: str = Field(..., min_length=8, max_length=128)
    hod_full_name: str = Field(..., min_length=1, max_length=150)
    hod_employee_id: str = Field(..., min_length=1, max_length=50)
    hod_designation: Optional[str] = Field(None, max_length=100)
    hod_qualification: Optional[str] = Field(None, max_length=255)
    hod_specialization: Optional[str] = Field(None, max_length=255)
    hod_phone: Optional[str] = Field(None, max_length=15)
    hod_office_room: Optional[str] = Field(None, max_length=50)


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    department_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^(active|inactive)$")


class DepartmentOut(BaseModel):
    id: UUID
    name: str
    code: str
    department_type: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    head_id: Optional[UUID] = None
    is_active: bool
    status: str
    created_at: datetime
    updated_at: datetime
    student_count: int = 0
    club_count: int = 0
    hod_name: Optional[str] = None
    hod_email: Optional[str] = None

    class Config:
        from_attributes = True


class DepartmentDetailOut(DepartmentOut):
    clubs: list = []
    channels: list = []
