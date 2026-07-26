import uuid
from datetime import datetime
from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    post = relationship("Post", back_populates="comments", foreign_keys=[post_id])
    author = relationship("User", back_populates="comments", foreign_keys=[author_id])
    parent = relationship("Comment", remote_side="Comment.id", backref="replies")
