from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    sender_id: Optional[UUID] = None
    type: str
    title: str
    body: str
    ref_type: Optional[str] = None
    ref_id: Optional[UUID] = None
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FCMTokenRegister(BaseModel):
    token: str
    device_info: Optional[str] = None


class NotificationPrefsOut(BaseModel):
    push_enabled: bool
    email_enabled: bool
    post_notifs: bool
    like_notifs: bool
    comment_notifs: bool
    mention_notifs: bool
    event_notifs: bool
    approval_notifs: bool
    leaderboard_notifs: bool
    message_notifs: bool
    announcement_notifs: bool
    channel_notifs: bool

    class Config:
        from_attributes = True


class NotificationPrefsUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    post_notifs: Optional[bool] = None
    like_notifs: Optional[bool] = None
    comment_notifs: Optional[bool] = None
    mention_notifs: Optional[bool] = None
    event_notifs: Optional[bool] = None
    approval_notifs: Optional[bool] = None
    leaderboard_notifs: Optional[bool] = None
    message_notifs: Optional[bool] = None
    announcement_notifs: Optional[bool] = None
    channel_notifs: Optional[bool] = None


class UnreadCountOut(BaseModel):
    count: int
