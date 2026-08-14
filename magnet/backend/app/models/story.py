import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class Story(Base):
    __tablename__ = "stories"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creator_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    media_url = Column(Text, nullable=False)
    media_type = Column(String(20), nullable=False, default="image", index=True)
    thumbnail_url = Column(Text, nullable=True)
    like_count = Column(Integer, nullable=False, default=0)
    comment_count = Column(Integer, nullable=False, default=0)
    view_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    creator = relationship("User", back_populates="stories", foreign_keys=[creator_id])
    likes = relationship("StoryLike", back_populates="story", cascade="all, delete-orphan")
    comments = relationship("StoryComment", back_populates="story", cascade="all, delete-orphan")
    views = relationship("StoryView", back_populates="story", cascade="all, delete-orphan")


class StoryLike(Base):
    __tablename__ = "story_likes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    story_id = Column(GUID(), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    story = relationship("Story", back_populates="likes")
    user = relationship("User", back_populates="story_likes")

    __table_args__ = (
        UniqueConstraint("story_id", "user_id", name="uq_story_likes_story_user"),
    )


class StoryComment(Base):
    __tablename__ = "story_comments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    story_id = Column(GUID(), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    story = relationship("Story", back_populates="comments")
    author = relationship("User", back_populates="story_comments")


class StoryView(Base):
    __tablename__ = "story_views"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    story_id = Column(GUID(), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    story = relationship("Story", back_populates="views")
    user = relationship("User", back_populates="story_views")

    __table_args__ = (
        UniqueConstraint("story_id", "user_id", name="uq_story_views_story_user"),
    )
