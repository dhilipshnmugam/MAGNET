from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    type: str = Field(default="public", pattern=r"^(public|private)$")
    department_id: Optional[UUID] = None


class ChannelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon_url: Optional[str] = None


class ChannelMemberOut(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class ChannelOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    type: str
    icon_url: Optional[str] = None
    owner_id: UUID
    department_id: Optional[UUID] = None
    member_count: int
    is_active: bool
    is_member: bool = False
    user_role: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChannelMessageCreate(BaseModel):
    content: Optional[str] = Field(None, max_length=5000)
    image_url: Optional[str] = None


class ChannelMessageOut(BaseModel):
    id: UUID
    channel_id: UUID
    sender_id: UUID
    content: Optional[str] = None
    image_url: Optional[str] = None
    is_deleted: bool
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
