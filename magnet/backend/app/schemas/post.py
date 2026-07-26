from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


POST_TYPE_CHOICES = [
    "general", "achievement", "event", "club_announcement",
    "academic_resource", "internship", "placement", "collaboration"
]
VISIBILITY_CHOICES = ["public", "department", "club_members", "private"]
ACHIEVEMENT_TYPES = ["hackathon", "certification", "sports", "academic", "project", "other"]
RESOURCE_TYPES = ["pdf", "notes", "study_material", "research_paper", "code", "other"]
COLLABORATION_TYPES = ["project", "startup", "research", "hackathon", "other"]
MEDIA_TYPES = ["image", "video", "document"]


class PostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    title: Optional[str] = Field(None, max_length=300)
    post_type: str = Field(default="general", pattern=r"^(general|achievement|event|club_announcement|academic_resource|internship|placement|collaboration)$")
    channel_id: Optional[UUID] = None
    club_id: Optional[UUID] = None
    visibility: str = Field(default="public", pattern=r"^(public|department|club_members|private)$")
    location: Optional[str] = Field(None, max_length=255)
    hashtags: Optional[str] = None
    mention_ids: Optional[str] = None

    achievement_type: Optional[str] = Field(None, max_length=50)
    achievement_score: Optional[int] = Field(None, ge=0, le=100)
    certificate_url: Optional[str] = None

    event_name: Optional[str] = Field(None, max_length=200)
    event_date: Optional[datetime] = None
    event_end_date: Optional[datetime] = None
    event_time: Optional[str] = Field(None, max_length=50)
    event_location: Optional[str] = Field(None, max_length=255)
    registration_url: Optional[str] = None

    resource_type: Optional[str] = Field(None, max_length=50)
    file_url: Optional[str] = None
    file_name: Optional[str] = Field(None, max_length=255)
    file_size: Optional[int] = None

    collaboration_type: Optional[str] = Field(None, max_length=50)
    required_skills: Optional[str] = None
    team_size: Optional[int] = Field(None, ge=2, le=50)


class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    title: Optional[str] = Field(None, max_length=300)
    visibility: Optional[str] = Field(None, pattern=r"^(public|department|club_members|private)$")
    location: Optional[str] = Field(None, max_length=255)
    hashtags: Optional[str] = None
    is_pinned: Optional[bool] = None


class PostMediaOut(BaseModel):
    id: UUID
    media_url: str
    media_type: str
    thumbnail_url: Optional[str] = None
    sort_order: int

    class Config:
        from_attributes = True


class PostAuthorOut(BaseModel):
    id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


class PostOut(BaseModel):
    id: UUID
    author_id: UUID
    content: str
    role: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    title: Optional[str] = None
    post_type: str = "general"
    channel_id: Optional[UUID] = None
    club_id: Optional[UUID] = None
    visibility: str
    location: Optional[str] = None
    hashtags: Optional[str] = None
    is_pinned: bool
    is_approved: bool
    like_count: int
    comment_count: int
    share_count: int = 0
    view_count: int = 0
    bookmark_count: int = 0

    achievement_type: Optional[str] = None
    achievement_score: Optional[int] = None
    certificate_url: Optional[str] = None

    event_name: Optional[str] = None
    event_date: Optional[datetime] = None
    event_end_date: Optional[datetime] = None
    event_time: Optional[str] = None
    event_location: Optional[str] = None
    registration_url: Optional[str] = None
    participant_count: int = 0

    resource_type: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None

    collaboration_type: Optional[str] = None
    required_skills: Optional[str] = None
    team_size: Optional[int] = None

    media: List[PostMediaOut] = []
    author: Optional[PostAuthorOut] = None
    is_liked_by_user: bool = False
    is_bookmarked_by_user: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[UUID] = None


class CommentOut(BaseModel):
    id: UUID
    post_id: UUID
    author_id: UUID
    parent_id: Optional[UUID] = None
    content: str
    is_deleted: bool
    author: Optional[PostAuthorOut] = None
    reply_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class LikeOut(BaseModel):
    id: UUID
    post_id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class PostAnalyticsOut(BaseModel):
    post_id: UUID
    views: int
    likes: int
    comments: int
    shares: int
    bookmarks: int
    engagement_rate: float


class TrendingTagOut(BaseModel):
    tag: str
    post_count: int
