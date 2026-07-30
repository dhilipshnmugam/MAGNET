import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.types import GUID


class Department(Base):
    __tablename__ = "departments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    department_type = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True)
    cover_image_url = Column(Text, nullable=True)
    head_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    head = relationship("User", foreign_keys=[head_id])
    users = relationship("User", back_populates="department", foreign_keys="User.department_id")
    channels = relationship("Channel", back_populates="department", foreign_keys="Channel.department_id")
    clubs = relationship("Club", back_populates="department", foreign_keys="Club.department_id")
    ranking = relationship("DepartmentRanking", back_populates="department", uselist=False)
