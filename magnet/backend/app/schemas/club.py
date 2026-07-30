from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ClubCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    domain: Optional[str] = Field(None, max_length=100)
    club_type: str = Field(default="technical", pattern=r"^(technical|cultural|sports|literary|social|other)$")
    department_id: Optional[UUID] = None
    faculty_coordinator_id: Optional[UUID] = None
    official_email: Optional[str] = Field(None, max_length=255)
    official_phone: Optional[str] = Field(None, max_length=15)
    website: Optional[str] = Field(None, max_length=255)
    instagram: Optional[str] = Field(None, max_length=150)
    linkedin: Optional[str] = Field(None, max_length=255)
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    approval_mode: str = Field(default="manual", pattern=r"^(manual|auto)$")
    status: str = Field(default="active", pattern=r"^(active|inactive)$")

    admin_email: str = Field(..., min_length=1, max_length=255)
    admin_password: str = Field(..., min_length=8, max_length=128)
    admin_full_name: str = Field(..., min_length=1, max_length=150)


class ClubUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    category: Optional[str] = None
    domain: Optional[str] = None
    club_type: Optional[str] = Field(None, pattern=r"^(technical|cultural|sports|literary|social|other)$")
    department_id: Optional[UUID] = None
    faculty_coordinator_id: Optional[UUID] = None
    official_email: Optional[str] = None
    official_phone: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    approval_mode: Optional[str] = Field(None, pattern=r"^(manual|auto)$")
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^(active|inactive)$")


class ClubOut(BaseModel):
    id: UUID
    name: str
    club_code: str
    description: Optional[str] = None
    category: Optional[str] = None
    domain: Optional[str] = None
    club_type: Optional[str] = None
    icon_url: Optional[str] = None
    banner_url: Optional[str] = None
    owner_id: UUID
    department_id: Optional[UUID] = None
    faculty_coordinator_id: Optional[UUID] = None
    club_admin_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    official_email: Optional[str] = None
    official_phone: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    approval_mode: str = "manual"
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


class ClubJoinRequestOut(BaseModel):
    id: UUID
    club_id: UUID
    user_id: UUID
    status: str
    message: Optional[str] = None
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    reviewer_name: Optional[str] = None

    class Config:
        from_attributes = True


class ClubMemberOut(BaseModel):
    id: UUID
    club_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_avatar: Optional[str] = None

    class Config:
        from_attributes = True


class ClubJoinRequestAction(BaseModel):
    status: str = Field(..., pattern=r"^(approved|rejected)$")
