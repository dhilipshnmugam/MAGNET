import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, SmallInteger, Integer,
    ForeignKey, CheckConstraint, UniqueConstraint, Float
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_id = Column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="SET NULL"), nullable=True, index=True)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="SET NULL"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    role = Column(String(20), nullable=True, index=True)
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    title = Column(String(300), nullable=True)
    post_type = Column(String(30), nullable=False, default="general", index=True)
    visibility = Column(String(20), nullable=False, default="public")
    location = Column(String(255), nullable=True)
    hashtags = Column(Text, nullable=True)
    mention_ids = Column(Text, nullable=True)
    is_pinned = Column(Boolean, nullable=False, default=False)
    is_approved = Column(Boolean, nullable=False, default=True)
    like_count = Column(Integer, nullable=False, default=0)
    comment_count = Column(Integer, nullable=False, default=0)
    share_count = Column(Integer, nullable=False, default=0)
    view_count = Column(Integer, nullable=False, default=0)
    bookmark_count = Column(Integer, nullable=False, default=0)

    achievement_type = Column(String(50), nullable=True)
    achievement_score = Column(Integer, nullable=True)
    certificate_url = Column(Text, nullable=True)

    event_name = Column(String(200), nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=True)
    event_end_date = Column(DateTime(timezone=True), nullable=True)
    event_time = Column(String(50), nullable=True)
    event_location = Column(String(255), nullable=True)
    registration_url = Column(Text, nullable=True)
    participant_count = Column(Integer, nullable=False, default=0)

    resource_type = Column(String(50), nullable=True)
    file_url = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)

    collaboration_type = Column(String(50), nullable=True)
    required_skills = Column(Text, nullable=True)
    team_size = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="posts", foreign_keys=[author_id])
    channel = relationship("Channel", back_populates="posts", foreign_keys=[channel_id])
    club = relationship("Club", back_populates="posts", foreign_keys=[club_id])
    media = relationship("PostMedia", back_populates="post", cascade="all, delete-orphan", order_by="PostMedia.sort_order")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="post", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("visibility IN ('public', 'department', 'club_members', 'private')", name="chk_posts_visibility"),
        CheckConstraint("post_type IN ('general', 'achievement', 'event', 'club_announcement', 'academic_resource', 'internship', 'placement', 'collaboration')", name="chk_posts_type"),
        CheckConstraint("NOT (channel_id IS NOT NULL AND club_id IS NOT NULL)", name="chk_posts_scope"),
    )


class PostMedia(Base):
    __tablename__ = "post_media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    media_url = Column(Text, nullable=False)
    media_type = Column(String(20), nullable=False, default="image")
    cloudinary_id = Column(String(255), nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    sort_order = Column(SmallInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    post = relationship("Post", back_populates="media")

    __table_args__ = (
        CheckConstraint("sort_order >= 0 AND sort_order <= 9", name="chk_post_media_order"),
        CheckConstraint("media_type IN ('image', 'video', 'document')", name="chk_post_media_type"),
    )


class PostImage(Base):
    __tablename__ = "post_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    cloudinary_id = Column(String(255), nullable=True)
    sort_order = Column(SmallInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("sort_order >= 0 AND sort_order <= 9", name="chk_post_images_order"),
    )


class Like(Base):
    __tablename__ = "likes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    post = relationship("Post", back_populates="likes")
    user = relationship("User", back_populates="likes")

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_likes_post_user"),
    )


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    post = relationship("Post", back_populates="bookmarks")
    user = relationship("User", back_populates="bookmarks")

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_bookmarks_post_user"),
    )


class PostShare(Base):
    __tablename__ = "post_shares"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    post = relationship("Post")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_shares_post_user"),
    )


class Hashtag(Base):
    __tablename__ = "hashtags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tag = Column(String(100), unique=True, nullable=False, index=True)
    post_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class PostHashtag(Base):
    __tablename__ = "post_hashtags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    hashtag_id = Column(UUID(as_uuid=True), ForeignKey("hashtags.id", ondelete="CASCADE"), nullable=False, index=True)

    post = relationship("Post")
    hashtag = relationship("Hashtag")

    __table_args__ = (
        UniqueConstraint("post_id", "hashtag_id", name="uq_post_hashtag"),
    )
