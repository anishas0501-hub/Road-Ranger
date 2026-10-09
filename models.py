from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    phone_number = Column(String, nullable=False, index=True)
    name = Column(String, nullable=True)
    profile_pic_url = Column(String, nullable=True)
    total_rewards = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 1-to-many relationship with Report
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    image_url = Column(String, nullable=True)
    damage_type = Column(String, nullable=False)
    severity_score = Column(Float, default=0.5, nullable=False)
    status = Column(String, default="reported", nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Link to User
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    reward_points_earned = Column(Integer, default=50, nullable=False)

    # Relationship back to User
    user = relationship("User", back_populates="reports")
