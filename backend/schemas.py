from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ReportBase(BaseModel):
    latitude: float
    longitude: float
    image_url: Optional[str] = None
    damage_type: str
    severity_score: Optional[float] = 0.5
    status: Optional[str] = "reported"
    description: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportUpdateStatus(BaseModel):
    status: str

class ReportResponse(ReportBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
