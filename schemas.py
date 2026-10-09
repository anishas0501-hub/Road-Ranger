from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# --- OTP Schemas ---
class OTPRequest(BaseModel):
    phone_number: str

class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp: str

# --- User Schemas ---
class UserRegisterRequest(BaseModel):
    phone_number: str
    username: str
    password: str
    name: Optional[str] = None
    profile_pic_url: Optional[str] = None

class UserLoginRequest(BaseModel):
    username: str
    password: str

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    profile_pic_url: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    phone_number: str
    name: Optional[str] = None
    profile_pic_url: Optional[str] = None
    total_rewards: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Report Schemas ---
class ReportBase(BaseModel):
    latitude: float
    longitude: float
    image_url: Optional[str] = None
    damage_type: str
    severity_score: Optional[float] = 0.5
    status: Optional[str] = "reported"
    description: Optional[str] = None
    user_id: Optional[int] = None

class ReportCreate(ReportBase):
    pass

class ReportUpdateStatus(BaseModel):
    status: str

class ReportResponse(ReportBase):
    id: int
    created_at: Optional[datetime] = None
    reward_points_earned: int = 50
    user_id: Optional[int] = None
    citizen_name: Optional[str] = None
    citizen_username: Optional[str] = None
    merged_count: int = 1
    merged_ticket_ids: List[int] = []
    reporters: List[str] = []

    class Config:
        from_attributes = True

# --- Citizen Profile & Ledger Schemas for Authority Portal ---
class ComplaintLedgerItem(BaseModel):
    id: int
    damage_type: str
    severity_score: float
    status: str
    created_at: Optional[datetime] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    reward_points_earned: int = 50
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True

class CitizenProfileResponse(BaseModel):
    id: int
    username: str
    phone_number: str
    name: Optional[str] = None
    profile_pic_url: Optional[str] = None
    total_rewards: int = 0
    created_at: Optional[datetime] = None
    total_complaints: int = 0
    complaints: List[ComplaintLedgerItem] = []

    class Config:
        from_attributes = True

class CitizenSummary(BaseModel):
    id: int
    username: str
    phone_number: str
    name: Optional[str] = None
    profile_pic_url: Optional[str] = None
    total_rewards: int = 0
    total_complaints: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
