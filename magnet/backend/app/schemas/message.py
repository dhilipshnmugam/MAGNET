from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime


class AttachmentOut(BaseModel):
    id: UUID
    file_type: str
    file_url: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None

    class Config:
        from_attributes = True


class ReactionOut(BaseModel):
    id: UUID
    user_id: UUID
    emoji: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: UUID
    conversation_id: Optional[UUID] = None
    sender_id: UUID
    receiver_id: UUID
    content: Optional[str] = None
    image_url: Optional[str] = None
    message_type: str = "text"
    reply_to_id: Optional[UUID] = None
    forwarded_from_id: Optional[UUID] = None
    is_forwarded: bool = False
    is_edited: bool = False
    is_starred: bool = False
    is_pinned: bool = False
    is_read: bool = False
    is_deleted: bool = False
    share_type: Optional[str] = None
    share_id: Optional[UUID] = None
    share_preview: Optional[Any] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    link_image: Optional[str] = None
    delivered_at: Optional[datetime] = None
    edited_at: Optional[datetime] = None
    created_at: datetime
    attachments: List[AttachmentOut] = []
    reactions: List[ReactionOut] = []
    reply_to: Optional[Any] = None

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    receiver_id: UUID
    content: Optional[str] = Field(None, max_length=5000)
    image_url: Optional[str] = None
    message_type: Optional[str] = "text"
    reply_to_id: Optional[UUID] = None
    forwarded_from_id: Optional[UUID] = None
    is_forwarded: Optional[bool] = False
    share_type: Optional[str] = None
    share_id: Optional[UUID] = None
    share_preview: Optional[Any] = None
    attachments: Optional[List[Dict[str, Any]]] = None


class MessageUpdate(BaseModel):
    content: Optional[str] = Field(None, max_length=5000)


class ConversationParticipantOut(BaseModel):
    user_id: UUID
    last_read_at: Optional[datetime] = None
    is_pinned: bool = False
    is_archived: bool = False
    is_muted: bool = False

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    conversation_id: UUID
    other_user_id: UUID
    other_user_name: str
    other_user_avatar: Optional[str] = None
    other_user_role: Optional[str] = None
    other_user_register_number: Optional[str] = None
    other_user_department: Optional[str] = None
    last_message: Optional[str] = None
    last_message_type: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    is_pinned: bool = False
    is_archived: bool = False
    is_muted: bool = False
    is_online: bool = False
    last_seen_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserSearchResult(BaseModel):
    id: UUID
    full_name: str
    email: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    register_number: Optional[str] = None
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    year: Optional[str] = None
    is_online: bool = False
    is_blocked: bool = False
    has_conversation: bool = False

    class Config:
        from_attributes = True
