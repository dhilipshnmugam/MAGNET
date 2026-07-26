from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    target_type: str = Field(default="all", pattern=r"^(all|department|channel|users)$")
    target_value: Optional[str] = None


class AnnouncementOut(BaseModel):
    id: UUID
    author_id: UUID
    title: str
    content: str
    target_type: str
    target_value: Optional[str] = None
    is_pinned: bool
    is_active: bool
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
