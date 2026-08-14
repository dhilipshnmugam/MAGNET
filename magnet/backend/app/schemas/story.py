from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class StoryCreate(BaseModel):
    media_url: str = Field(..., min_length=1)
    media_type: str = Field(default="image", pattern=r"^(image|video)$")
    content: Optional[str] = Field(None, max_length=1000)
    thumbnail_url: Optional[str] = None


class StoryCreatorOut(BaseModel):
    id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class StoryOut(BaseModel):
    id: UUID
    creator_id: UUID
    content: Optional[str] = None
    media_url: str
    media_type: str
    thumbnail_url: Optional[str] = None
    like_count: int
    comment_count: int
    view_count: int = 0
    is_liked_by_user: bool = False
    creator: Optional[StoryCreatorOut] = None
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class StoryViewerOut(BaseModel):
    user_id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    viewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoryLikerOut(BaseModel):
    user_id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    liked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoryCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


class StoryCommentOut(BaseModel):
    id: UUID
    story_id: UUID
    author_id: UUID
    content: str
    author: Optional[StoryCreatorOut] = None
    created_at: datetime

    class Config:
        from_attributes = True
