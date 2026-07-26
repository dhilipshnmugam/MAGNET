import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    head_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    head = relationship("User", foreign_keys=[head_id])
    users = relationship("User", back_populates="department", foreign_keys="User.department_id")
    channels = relationship("Channel", back_populates="department", foreign_keys="Channel.department_id")
    clubs = relationship("Club", back_populates="department", foreign_keys="Club.department_id")
    ranking = relationship("DepartmentRanking", back_populates="department", uselist=False)
