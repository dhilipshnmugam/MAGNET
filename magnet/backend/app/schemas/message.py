from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class MessageCreate(BaseModel):
    receiver_id: UUID
    content: Optional[str] = Field(None, max_length=5000)
    image_url: Optional[str] = None


class MessageOut(BaseModel):
    id: UUID
    sender_id: UUID
    receiver_id: UUID
    content: Optional[str] = None
    image_url: Optional[str] = None
    is_read: bool
    is_deleted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    other_user_id: UUID
    other_user_name: str
    other_user_avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class WebSocketMessage(BaseModel):
    type: str
    receiver_id: Optional[UUID] = None
    channel_id: Optional[UUID] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
