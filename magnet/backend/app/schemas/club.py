from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ClubCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    domain: str = Field(..., max_length=100)
    description: str = Field(..., min_length=1, max_length=2000)
    department_id: Optional[UUID] = None
    faculty_coordinator_id: Optional[UUID] = None
    club_admin_id: Optional[UUID] = None
    email: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=15)
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    status: str = Field(default="active", pattern=r"^(active|inactive)$")


class ClubUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    domain: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[UUID] = None
    faculty_coordinator_id: Optional[UUID] = None
    club_admin_id: Optional[UUID] = None
    email: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=15)
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^(active|inactive)$")


class ClubOut(BaseModel):
    id: UUID
    name: str
    club_code: str
    domain: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    owner_id: UUID
    department_id: Optional[UUID] = None
    faculty_coordinator_id: Optional[UUID] = None
    club_admin_id: Optional[UUID] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    status: str
    member_count: int = 0
    created_at: datetime
    faculty_coordinator_name: Optional[str] = None
    club_admin_name: Optional[str] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


class ClubDetailOut(ClubOut):
    post_count: int = 0
    event_count: int = 0
