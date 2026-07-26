import uuid
from datetime import datetime
from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])

    __table_args__ = (
        CheckConstraint("sender_id != receiver_id", name="chk_dm_no_self"),
        CheckConstraint("content IS NOT NULL OR image_url IS NOT NULL", name="chk_dm_content"),
    )
