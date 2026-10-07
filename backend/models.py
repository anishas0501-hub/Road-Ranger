from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Text
from database import Base

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
