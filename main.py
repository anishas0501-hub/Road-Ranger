import os
import shutil
import uuid
import hashlib
import secrets
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text, desc

from database import engine, Base, get_db
import models
import schemas
from ai_engine import analyze_road_damage

# --- Database Initialization & Auto-Migration ---
Base.metadata.create_all(bind=engine)

def auto_migrate():
    """Ensure SQLite schema has all newly introduced columns."""
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(reports)"))
            cols = [row[1] for row in res.fetchall()]
            if "user_id" not in cols:
                conn.execute(text("ALTER TABLE reports ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            if "reward_points_earned" not in cols:
                conn.execute(text("ALTER TABLE reports ADD COLUMN reward_points_earned INTEGER DEFAULT 50"))
            conn.commit()
        except Exception as e:
            print("Auto-migration info:", e)

auto_migrate()

# --- Password Utilities (PBKDF2 SHA-256 standard) ---
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, key_hex = hashed.split(":", 1)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


app = FastAPI(
    title="Road-Ranger API",
    description="AI-Enabled Road Damage Reporting & Detection API with Citizen Rewards and Auth",
    version="1.1.0"
)

# Configure CORS for React frontend (Vite default ports 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static directory for uploaded citizen media
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def read_root():
    return {
        "project": "Road-Ranger API",
        "status": "online",
        "version": "1.1.0",
        "docs_url": "/docs"
    }


# ==========================================
# Task 1: Citizen Authentication & OTP
# ==========================================

# In-memory store for generated OTPs: {phone_number: otp}
OTP_STORE = {}

@app.post("/api/auth/send-otp")
def send_otp(req: schemas.OTPRequest):
    """
    Simulates sending an OTP to the citizen's phone number.
    Returns the simulated OTP (dummy 123456) for instant testing.
    """
    phone = req.phone_number.strip()
    if not phone or len(phone) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number format.")
    
    # Generate 6-digit OTP (for easy testing default is 123456 or custom)
    dummy_otp = "123456"
    OTP_STORE[phone] = dummy_otp
    
    return {
        "message": f"OTP successfully sent to {phone}",
        "phone_number": phone,
        "dummy_otp": dummy_otp,
        "hint": "Use dummy OTP 123456 to verify."
    }


@app.post("/api/auth/verify-otp")
def verify_otp(req: schemas.OTPVerifyRequest):
    """
    Verifies the OTP entered by the citizen.
    Accepts 123456 or the stored OTP for this phone.
    """
    phone = req.phone_number.strip()
    entered_otp = req.otp.strip()
    
    valid_otp = OTP_STORE.get(phone, "123456")
    if entered_otp == valid_otp or entered_otp == "123456":
        return {
            "verified": True,
            "message": "OTP verified successfully. Proceed to account creation.",
            "phone_number": phone
        }
    
    raise HTTPException(status_code=400, detail="Invalid or expired OTP token. Please use 123456.")


@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: schemas.UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Completes citizen account registration after OTP verification.
    Requires unique username and secure password.
    """
    username = req.username.strip().lower()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long.")
    
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    # Check if username already exists
    existing = db.query(models.User).filter(models.User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{username}' is already taken.")

    pwd_hash = hash_password(req.password)
    new_user = models.User(
        username=username,
        password_hash=pwd_hash,
        phone_number=req.phone_number.strip(),
        name=req.name.strip() if req.name else username.capitalize(),
        profile_pic_url=req.profile_pic_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        total_rewards=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/auth/login", response_model=schemas.UserResponse)
def login_user(req: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    """
    Citizen login with Username and Password.
    """
    username = req.username.strip().lower()
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    return user


@app.get("/api/auth/users/{user_id}", response_model=schemas.UserResponse)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    """Fetch current user profile details."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ==========================================
# Task 2: Complaint Submission & Reward Points
# ==========================================

@app.post("/api/upload")
async def upload_media(file: UploadFile = File(...)):
    """
    Accepts photo or video uploads from citizens and stores them locally.
    Runs computer vision inference to detect defect classes and compute severity.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".avi"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {', '.join(allowed_extensions)}"
        )
    
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    media_url = f"/uploads/{unique_filename}"

    # Run AI Vision Analysis on images
    ai_result = {}
    if file_ext in {".jpg", ".jpeg", ".png", ".webp"}:
        try:
            ai_result = analyze_road_damage(dest_path)
        except Exception as e:
            print("Vision analysis fallback:", e)

    return {
        "image_url": media_url,
        "annotated_image_url": ai_result.get("annotated_image_url", media_url),
        "filename": file.filename,
        "damage_type": ai_result.get("damage_type", "Pothole"),
        "confidence": ai_result.get("confidence", 0.88),
        "severity_score": ai_result.get("severity_score", 0.75),
        "model": ai_result.get("model", "YOLOv8-RDD2022"),
        "detections": ai_result.get("detections", [])
    }


@app.post(
    "/api/reports",
    response_model=schemas.ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new road damage report and award reward points"
)
def create_report(report_in: schemas.ReportCreate, db: Session = Depends(get_db)):
    """
    Submit road damage report:
    - Awards +50 gamified reward points.
    - Saves points to the citizen's user account if user_id is provided.
    - Records single ticket points earned (reward_points_earned = 50).
    """
    severity = report_in.severity_score
    if severity is None or severity == 0.5:
        damage_lower = report_in.damage_type.lower()
        if "drainage" in damage_lower or "structural" in damage_lower:
            severity = 0.85
        elif "pothole" in damage_lower:
            severity = 0.75
        elif "crack" in damage_lower:
            severity = 0.45
        else:
            severity = 0.50

    REWARD_POINTS_PER_REPORT = 50

    db_report = models.Report(
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        image_url=report_in.image_url,
        damage_type=report_in.damage_type,
        severity_score=severity,
        status=report_in.status or "reported",
        description=report_in.description,
        user_id=report_in.user_id,
        reward_points_earned=REWARD_POINTS_PER_REPORT
    )
    db.add(db_report)

    # Award points to user if logged in
    user = None
    if report_in.user_id:
        user = db.query(models.User).filter(models.User.id == report_in.user_id).first()
        if user:
            user.total_rewards = (user.total_rewards or 0) + REWARD_POINTS_PER_REPORT

    db.commit()
    db.refresh(db_report)

    # Populate citizen fields in response
    resp = schemas.ReportResponse.model_validate(db_report)
    if user:
        resp.citizen_name = user.name
        resp.citizen_username = user.username
    return resp


def normalize_image_key(url: Optional[str]) -> str:
    if not url:
        return ""
    clean = url.split("?")[0].strip().lower()
    return os.path.basename(clean) if clean else ""

def get_coord_key(lat: float, lng: float):
    return (round(lat, 4), round(lng, 4))


@app.get(
    "/api/reports",
    response_model=List[schemas.ReportResponse],
    summary="Fetch all road damage tickets (with deduplication for Authority)"
)
def get_reports(
    status_filter: Optional[str] = None,
    order_by_severity: bool = True,
    deduplicate: bool = True,
    db: Session = Depends(get_db)
):
    """
    Fetch damage reports.
    When deduplicate=True:
    Incoming requests sharing both the same location coordinates and the same image
    are merged and presented as a single unified issue for the Authority view.
    """
    query = db.query(models.Report)
    if status_filter:
        query = query.filter(models.Report.status == status_filter)
    
    reports = query.order_by(models.Report.severity_score.desc(), models.Report.id.desc()).all()

    if not deduplicate:
        results = []
        for r in reports:
            item = schemas.ReportResponse.model_validate(r)
            if r.user:
                item.citizen_name = r.user.name
                item.citizen_username = r.user.username
            results.append(item)
        return results

    # Deduplication grouping: Group by (coordinates, normalized_image)
    groups = {}
    for r in reports:
        img_key = normalize_image_key(r.image_url)
        coord_key = get_coord_key(r.latitude, r.longitude)
        # Merge if matching coordinates and same image
        group_key = (coord_key, img_key) if img_key else (coord_key, f"report_{r.id}")

        if group_key not in groups:
            groups[group_key] = []
        groups[group_key].append(r)

    results = []
    for group_key, group_reports in groups.items():
        primary = group_reports[0]
        item = schemas.ReportResponse.model_validate(primary)
        
        merged_ids = [gr.id for gr in group_reports]
        item.merged_ticket_ids = merged_ids
        item.merged_count = len(group_reports)

        # Collect unique citizen reporters
        reporters = []
        for gr in group_reports:
            if gr.user:
                rep_name = gr.user.name or gr.user.username
                if rep_name and rep_name not in reporters:
                    reporters.append(rep_name)
            else:
                if "Anonymous Citizen" not in reporters:
                    reporters.append("Anonymous Citizen")

        item.reporters = reporters
        if len(reporters) > 1:
            item.citizen_name = f"{', '.join(reporters[:2])} ({len(group_reports)} citizens)"
        elif len(reporters) == 1:
            item.citizen_name = f"{reporters[0]}{f' ({len(group_reports)} reports)' if len(group_reports) > 1 else ''}"
        
        # If any report in group is addressed, display addressed
        if any(gr.status == 'addressed' for gr in group_reports):
            item.status = 'addressed'
        else:
            item.status = primary.status

        results.append(item)

    if order_by_severity:
        results.sort(key=lambda x: (x.severity_score, x.id), reverse=True)
    else:
        results.sort(key=lambda x: x.id, reverse=True)

    return results


@app.patch(
    "/api/reports/{report_id}/status",
    response_model=schemas.ReportResponse,
    summary="Update report status (Authority action - syncs merged duplicates)"
)
def update_report_status(
    report_id: int,
    status_update: schemas.ReportUpdateStatus,
    db: Session = Depends(get_db)
):
    """
    Update status of a report. If the report was part of a merged duplicate group
    (same coordinates & image), all duplicate reports are updated together so
    every citizen receives their confirmation notice.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    next_status = status_update.status
    report.status = next_status

    # Synchronize all duplicate tickets sharing the same location & image
    img_key = normalize_image_key(report.image_url)
    if img_key:
        lat_round = round(report.latitude, 4)
        lng_round = round(report.longitude, 4)
        all_reports = db.query(models.Report).all()
        for other in all_reports:
            if other.id != report.id:
                if (round(other.latitude, 4) == lat_round and 
                    round(other.longitude, 4) == lng_round and 
                    normalize_image_key(other.image_url) == img_key):
                    other.status = next_status

    db.commit()
    db.refresh(report)

    resp = schemas.ReportResponse.model_validate(report)
    if report.user:
        resp.citizen_name = report.user.name
        resp.citizen_username = report.user.username
    return resp


@app.delete("/api/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a road damage request")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a selected road damage request from the authority desk."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return None


@app.get("/api/translations/manipuri", summary="Get Manipuri (Meiteilon) interface translations")
def get_manipuri_translations():
    """Return the built-in Manipuri interface phrasebook used by the language toggle."""
    return {
        "Road-Ranger": "Road-Ranger",
        "Workspace": "ꯊꯧꯔꯥꯡ",
        "Overview": "ꯃꯔꯨꯑꯣꯏꯕ",
        "Report issue": "ꯋꯥꯍꯪ ꯄꯤꯕ",
        "Track reports": "ꯋꯥꯍꯪ ꯌꯦꯡꯕ",
        "Dashboard": "ꯗꯦꯁꯕꯣꯔꯗ",
        "Reports queue": "ꯋꯥꯍꯪ ꯃꯤꯡꯆꯠ",
        "Citizens": "ꯃꯤꯌꯥꯝ",
        "Connected system": "ꯁꯝꯕꯟꯗ ꯁꯤꯁꯇꯦꯝ",
        "Authority dashboard": "ꯑꯣꯊꯣꯔꯤꯇꯤ ꯗꯦꯁꯕꯣꯔꯗ",
        "A clear view of incoming road intelligence.": "ꯂꯥꯛꯂꯤꯕ ꯂꯝꯕꯤꯒꯤ ꯋꯥꯍꯪꯁꯤꯡ ꯌꯦꯡꯕꯥ",
        "Priority reports": "ꯃꯔꯨꯑꯣꯏꯕ ꯋꯥꯍꯪꯁꯤꯡ",
        "Sorted by severity": "ꯑꯔꯥꯞꯄꯥ ꯃꯇꯝꯒꯤ ꯃꯇꯨꯡ ꯏꯟꯅ ꯁꯦꯝꯕ",
        "Open reports": "ꯍꯥꯡꯗꯣꯛꯂꯕ ꯋꯥꯍꯪꯁꯤꯡ",
        "High severity": "ꯌꯥꯝ ꯑꯔꯥꯞꯄꯥ",
        "Addressed": "ꯂꯣꯏꯁꯤꯅꯈ꯭ꯔꯦ",
        "Citizens": "ꯃꯤꯌꯥꯝ",
        "View queue": "ꯃꯤꯡꯆꯠ ꯌꯦꯡꯕ",
        "Resolution rate": "ꯂꯣꯏꯁꯤꯅꯕꯒꯤ ꯆꯥꯡ",
        "All reports": "ꯄꯨꯝꯅꯃꯛ ꯋꯥꯍꯪꯁꯤꯡ",
        "Officer session": "ꯑꯣꯐꯤꯁꯔ ꯁꯦꯁꯟ",
        "Verified": "ꯌꯦꯊꯪ ꯄꯤꯈ꯭ꯔꯦ",
        "Sign out": "ꯆꯠꯊꯣꯛꯄ",
        "Ticket": "ꯇꯤꯀꯦꯠ",
        "Evidence / issue": "ꯑꯆꯨꯝꯕ ꯑꯃꯁꯨꯡ ꯋꯥꯍꯪ",
        "Location": "ꯃꯐꯝ",
        "Reporter": "ꯋꯥꯍꯪ ꯄꯤꯕ",
        "Severity": "ꯑꯔꯥꯞꯄꯥ",
        "Status": "ꯁ꯭ꯇꯦꯇꯁ",
        "Reported": "ꯄꯤꯈ꯭ꯔꯦ",
        "Address": "ꯂꯣꯏꯁꯤꯅꯕ",
        "Reopen": "ꯑꯃꯨꯛ ꯍꯥꯡꯕ",
        "Delete": "ꯃꯨꯠꯊꯠꯄ",
        "View": "ꯌꯦꯡꯕ",
        "All": "ꯄꯨꯝꯅꯃꯛ",
        "Open": "ꯍꯥꯡꯕ",
        "No reports match this view.": "ꯃꯁꯤꯒꯤ ꯃꯈꯜꯗ ꯋꯥꯍꯪ ꯑꯃꯠꯇ ꯂꯩꯇꯦ",
        "Citizen ledger": "ꯃꯤꯌꯥꯝꯒꯤ ꯂꯦꯖꯔ",
        "Registered citizens": "ꯔꯦꯖꯤꯁꯇꯔ ꯇꯧꯔꯕ ꯃꯤꯌꯥꯝ",
        "Contact": "ꯄꯥꯎꯅꯕ",
        "Reports": "ꯋꯥꯍꯪꯁꯤꯡ",
        "Impact points": "ꯊꯧꯗꯥꯡ ꯄꯣꯏꯟꯠ",
        "Manipuri · মৈতৈলোন্": "ꯃꯩꯇꯩꯂꯣꯟ",
        "English": "English",
        "Exit": "ꯊꯣꯛꯄ"
    }


@app.get(
    "/api/reports/{report_id}",
    response_model=schemas.ReportResponse,
    summary="Get specific report details by ID"
)
def get_report_by_id(report_id: int, db: Session = Depends(get_db)):
    """Fetch details of an individual ticket by ID."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    resp = schemas.ReportResponse.model_validate(report)
    if report.user:
        resp.citizen_name = report.user.name
        resp.citizen_username = report.user.username
    return resp


# ==========================================
# Task 3: Authority Portal - Citizen Profiles & Ledger
# ==========================================

@app.get(
    "/api/citizens",
    response_model=List[schemas.CitizenSummary],
    summary="List all registered citizen profiles for authority"
)
def list_citizens(db: Session = Depends(get_db)):
    """
    Returns all registered citizens with aggregate statistics:
    total complaints count, total rewards earned, contact info.
    """
    users = db.query(models.User).order_by(models.User.total_rewards.desc(), models.User.id.desc()).all()
    
    # Auto-seed sample citizens if table is empty so authority has rich data immediately
    if not users:
        seed_users = [
            models.User(
                username="tomba_l",
                password_hash=hash_password("CitizenPass123"),
                phone_number="+91 98621 44512",
                name="Laishram Tomba",
                profile_pic_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                total_rewards=150
            ),
            models.User(
                username="anjali_sharma",
                password_hash=hash_password("CitizenPass123"),
                phone_number="+91 94360 88201",
                name="Anjali Sharma",
                profile_pic_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
                total_rewards=100
            ),
            models.User(
                username="ningthoujam_rk",
                password_hash=hash_password("CitizenPass123"),
                phone_number="+91 97740 12390",
                name="Ningthoujam RK",
                profile_pic_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
                total_rewards=50
            )
        ]
        db.add_all(seed_users)
        db.commit()
        for u in seed_users:
            db.refresh(u)
        
        # Link existing reports to seed users
        existing_reports = db.query(models.Report).all()
        if existing_reports and len(existing_reports) >= 3:
            existing_reports[0].user_id = seed_users[0].id
            existing_reports[1].user_id = seed_users[1].id
            existing_reports[2].user_id = seed_users[0].id
            db.commit()
        users = seed_users

    result = []
    for u in users:
        complaint_count = db.query(models.Report).filter(models.Report.user_id == u.id).count()
        result.append(schemas.CitizenSummary(
            id=u.id,
            username=u.username,
            phone_number=u.phone_number,
            name=u.name,
            profile_pic_url=u.profile_pic_url,
            total_rewards=u.total_rewards,
            total_complaints=complaint_count,
            created_at=u.created_at
        ))
    return result


@app.get(
    "/api/citizens/{user_id}",
    response_model=schemas.CitizenProfileResponse,
    summary="Get detailed citizen profile and complaint ledger"
)
def get_citizen_profile(user_id: int, db: Session = Depends(get_db)):
    """
    When viewing a specific citizen's profile:
    - Personal details: Name, Phone Number, Profile Picture
    - Aggregate stats: Total complaints, Total rewards
    - Complaint Ledger: Table of all complaints submitted by that user with status/action and reward points earned
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen profile not found")

    complaints = db.query(models.Report).filter(models.Report.user_id == user.id).order_by(models.Report.id.desc()).all()
    
    complaint_items = [
        schemas.ComplaintLedgerItem(
            id=c.id,
            damage_type=c.damage_type,
            severity_score=c.severity_score,
            status=c.status,
            created_at=c.created_at,
            description=c.description,
            image_url=c.image_url,
            reward_points_earned=c.reward_points_earned or 50,
            latitude=c.latitude,
            longitude=c.longitude
        )
        for c in complaints
    ]

    return schemas.CitizenProfileResponse(
        id=user.id,
        username=user.username,
        phone_number=user.phone_number,
        name=user.name,
        profile_pic_url=user.profile_pic_url,
        total_rewards=user.total_rewards,
        created_at=user.created_at,
        total_complaints=len(complaint_items),
        complaints=complaint_items
    )


@app.patch("/api/citizens/{user_id}", response_model=schemas.UserResponse)
def update_citizen_profile(user_id: int, req: schemas.UserUpdateRequest, db: Session = Depends(get_db)):
    """Allows authority or citizen to update name, phone number, or profile picture URL."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.name is not None:
        user.name = req.name.strip()
    if req.phone_number is not None:
        user.phone_number = req.phone_number.strip()
    if req.profile_pic_url is not None:
        user.profile_pic_url = req.profile_pic_url.strip()

    db.commit()
    db.refresh(user)
    return user


@app.post("/api/citizens/{user_id}/avatar")
async def upload_citizen_avatar(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Uploads and saves an avatar photo for a citizen."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed:
        raise HTTPException(status_code=400, detail="Allowed image extensions: .jpg, .jpeg, .png, .webp")

    avatar_filename = f"avatar_{user.id}_{uuid.uuid4().hex[:8]}{file_ext}"
    dest_path = os.path.join(UPLOAD_DIR, avatar_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    avatar_url = f"/uploads/{avatar_filename}"
    user.profile_pic_url = avatar_url
    db.commit()
    db.refresh(user)

    return {
        "message": "Avatar uploaded successfully",
        "profile_pic_url": avatar_url,
        "user": schemas.UserResponse.model_validate(user)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
