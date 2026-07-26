import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    request_type = Column(String(30), nullable=False)
    target_type = Column(String(30), nullable=True)
    target_id = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String(15), nullable=False, default="pending", index=True)
    request_note = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="approval_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        CheckConstraint(
            "request_type IN ('registration', 'channel_create', 'announcement', 'event', 'content_flag')",
            name="chk_approval_request_type"
        ),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="chk_approval_status"
        ),
    )
