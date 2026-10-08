from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    full_name: str
    mobile_number: str
    username: str
    profile_photo_url: Optional[str] = None
    reward_points: Optional[int] = 0

class UserCreate(UserBase):
    password: str

class SendOtpRequest(BaseModel):
    mobile_number: str

class SendOtpResponse(BaseModel):
    success: bool
    message: str
    dummy_otp: str

class UserRegisterRequest(BaseModel):
    mobile_number: str
    otp: str
    full_name: str
    username: str
    password: str

class UserLoginRequest(BaseModel):
    identifier: str
    password: str

class UserProfileUpdateRequest(BaseModel):
    profile_photo_url: Optional[str] = None
    full_name: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Report Schemas
class ReportBase(BaseModel):
    user_id: Optional[int] = None
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
    report_ids: Optional[List[int]] = None

class ClusterMediaItem(BaseModel):
    report_id: int
    image_url: str
    media_url: Optional[str] = None
    reporter_name: Optional[str] = None
    created_at: Optional[datetime] = None

class ReportResponse(ReportBase):
    id: int
    created_at: Optional[datetime] = None
    media_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    reporter_name: Optional[str] = None
    report_count: Optional[int] = 1
    report_ids: Optional[List[int]] = None
    media_list: Optional[List[ClusterMediaItem]] = None

    class Config:
        from_attributes = True

class ClusterStatusUpdateRequest(BaseModel):
    report_ids: List[int]
    status: str

class ClusteredReportResponse(BaseModel):
    id: int
    report_ids: List[int]
    report_count: int
    damage_type: str
    severity_score: float
    status: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    image_url: Optional[str] = None
    media_url: Optional[str] = None
    media_list: List[ClusterMediaItem] = []
    reporter_name: Optional[str] = None

    class Config:
        from_attributes = True


