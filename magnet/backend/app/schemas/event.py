from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    event_date: datetime
    end_date: Optional[datetime] = None
    venue: Optional[str] = Field(None, max_length=255)
    event_type: str = Field(default="general", max_length=50)
    banner_url: Optional[str] = None


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    venue: Optional[str] = Field(None, max_length=255)
    event_type: Optional[str] = None
    banner_url: Optional[str] = None


class EventOut(BaseModel):
    id: UUID
    creator_id: UUID
    title: str
    description: Optional[str] = None
    event_date: datetime
    end_date: Optional[datetime] = None
    venue: Optional[str] = None
    event_type: str
    banner_url: Optional[str] = None
    rsvp_count: int
    creator_name: Optional[str] = None
    user_rsvp_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RSVPCreate(BaseModel):
    status: str = Field(..., pattern=r"^(going|interested|not_going)$")


class RSVOUt(BaseModel):
    id: UUID
    event_id: UUID
    user_id: UUID
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
