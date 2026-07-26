from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ApprovalRequestCreate(BaseModel):
    request_type: str = Field(..., pattern=r"^(registration|channel_create|announcement|event|content_flag)$")
    target_type: Optional[str] = None
    target_id: Optional[UUID] = None
    request_note: Optional[str] = None


class ApprovalRequestOut(BaseModel):
    id: UUID
    user_id: UUID
    request_type: str
    target_type: Optional[str] = None
    target_id: Optional[UUID] = None
    status: str
    request_note: Optional[str] = None
    reviewed_by: Optional[UUID] = None
    review_note: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApprovalReview(BaseModel):
    status: str = Field(..., pattern=r"^(approved|rejected)$")
    review_note: Optional[str] = None
