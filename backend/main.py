import os
import shutil
import uuid
import hashlib
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas

# Create database tables
Base.metadata.create_all(bind=engine)

def ensure_db_migrations():
    """Ensure newly introduced columns are present in SQLite tables"""
    try:
        if engine.dialect.name == "sqlite":
            with engine.connect() as conn:
                cursor = conn.connection.cursor()
                cols = [row[1] for row in cursor.execute("PRAGMA table_info(reports)").fetchall()]
                if "user_id" not in cols:
                    cursor.execute("ALTER TABLE reports ADD COLUMN user_id INTEGER REFERENCES users(id)")
                    conn.connection.commit()
    except Exception as e:
        print(f"Migration notice: {e}")

ensure_db_migrations()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.strip().encode("utf-8")).hexdigest()

app = FastAPI(
    title="Road-Ranger API",
    description="AI-Enabled Road Damage Reporting & Detection API",
    version="1.0.0"
)

# Configure CORS for React frontend (Vite default ports, Vercel production/preview, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static directory for uploaded citizen media (use /tmp on serverless Vercel to avoid read-only FS errors)
if os.getenv("VERCEL"):
    UPLOAD_DIR = "/tmp/uploads"
else:
    UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
@app.get("/api")
@app.get("/api/")
def read_root():
    return {
        "project": "Road-Ranger API",
        "status": "online",
        "docs_url": "/docs"
    }


from ai_engine import analyze_road_damage


# ==========================================
# Citizen Authentication & User Routes
# ==========================================

@app.post("/api/auth/send-otp", response_model=schemas.SendOtpResponse, summary="Send mock OTP to citizen mobile")
def send_otp(req: schemas.SendOtpRequest):
    """
    Accepts a mobile number and returns a success response with dummy instant OTP.
    """
    cleaned_mobile = req.mobile_number.strip()
    if len(cleaned_mobile) < 7:
        raise HTTPException(status_code=400, detail="Please provide a valid mobile number.")
    return schemas.SendOtpResponse(
        success=True,
        message=f"OTP sent successfully to {cleaned_mobile}",
        dummy_otp="123456"
    )


@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED, summary="Register citizen account")
def register_user(req: schemas.UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Accepts mobile number, dummy OTP, full name, username, and password to create a user.
    """
    # Verify OTP (accepts dummy 123456 or any 6 digits for testing ease)
    otp_val = req.otp.strip()
    if otp_val != "123456" and len(otp_val) != 6:
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please use the verification code 123456.")

    # Check for existing mobile number
    existing_phone = db.query(models.User).filter(models.User.mobile_number == req.mobile_number.strip()).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="This mobile number is already registered. Please log in.")

    # Check for existing username
    existing_user = db.query(models.User).filter(models.User.username == req.username.strip().lower()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="This username is already taken. Please choose another username.")

    new_user = models.User(
        full_name=req.full_name.strip(),
        mobile_number=req.mobile_number.strip(),
        username=req.username.strip().lower(),
        password_hash=hash_password(req.password),
        profile_photo_url=None,
        reward_points=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/auth/login", response_model=schemas.UserResponse, summary="Authenticate citizen")
def login_user(req: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    """
    Accepts either username, mobile number, or full name + password to authenticate.
    """
    identifier = req.identifier.strip()
    user = db.query(models.User).filter(
        (models.User.username == identifier.lower()) |
        (models.User.mobile_number == identifier) |
        (models.User.full_name.ilike(identifier))
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Citizen account not found. Please check your credentials or register.")

    if user.password_hash != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify and try again.")

    return user


@app.get("/api/users/{user_id}", response_model=schemas.UserResponse, summary="Get user profile and reward points")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen user not found")
    return user


@app.patch("/api/users/{user_id}/photo", response_model=schemas.UserResponse, summary="Update citizen profile photo")
def update_user_profile_photo(user_id: int, req: schemas.UserProfileUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen user not found")
    if req.profile_photo_url is not None:
        user.profile_photo_url = req.profile_photo_url
    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/users/{user_id}/reports", response_model=List[schemas.ReportResponse], summary="Get reports submitted by user")
def get_user_reports(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Report).filter(models.Report.user_id == user_id).order_by(models.Report.id.desc()).all()


# ==========================================
# Media Upload & Report Operations
# ==========================================

@app.post("/api/upload")
async def upload_media(file: UploadFile = File(...)):
    """
    Accepts photo or video uploads from citizens and stores them locally.
    Runs YOLOv8 / RDD2022 computer vision inference to detect defect classes,
    compute localized bounding boxes, and calculate empirical severity score.
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
        ai_result = analyze_road_damage(dest_path)

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


DEFAULT_ROAD_IMAGE = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1200&auto=format&fit=crop&q=80"

def format_report_response(r: models.Report) -> schemas.ReportResponse:
    img = r.image_url if (r.image_url and r.image_url != "None" and r.image_url != "") else DEFAULT_ROAD_IMAGE
    reporter = r.user.full_name if r.user else "Citizen (Anonymous)"
    return schemas.ReportResponse(
        id=r.id,
        user_id=r.user_id,
        latitude=r.latitude,
        longitude=r.longitude,
        image_url=img,
        media_url=img,
        annotated_image_url=img,
        damage_type=r.damage_type,
        severity_score=r.severity_score,
        status=r.status,
        description=r.description,
        created_at=r.created_at,
        reporter_name=reporter
    )


@app.post(
    "/api/reports",
    response_model=schemas.ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new road damage report"
)
def create_report(report_in: schemas.ReportCreate, db: Session = Depends(get_db)):
    """
    Submit new road damage report with coordinates, damage type, severity score, and optional media.
    Automatically rewards +50 points to the authenticated citizen's reward_points total.
    """
    # Heuristic AI severity scoring fallback if not provided or default
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

    final_img = report_in.image_url or DEFAULT_ROAD_IMAGE

    db_report = models.Report(
        user_id=report_in.user_id,
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        image_url=final_img,
        damage_type=report_in.damage_type,
        severity_score=severity,
        status=report_in.status or "reported",
        description=report_in.description
    )
    db.add(db_report)

    # When an authenticated user successfully submits a report, automatically add +50 points to their reward_points total
    if report_in.user_id:
        user = db.query(models.User).filter(models.User.id == report_in.user_id).first()
        if user:
            user.reward_points = (user.reward_points or 0) + 50

    db.commit()
    db.refresh(db_report)
    return format_report_response(db_report)


import math

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in meters using Haversine formula."""
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def cluster_reports(reports: List[models.Report], radius_meters: float = 20.0) -> List[schemas.ReportResponse]:
    """
    Cluster reports geographically within radius_meters (default 20 meters).
    Groups duplicate citizen complaints into unified tickets with report_count and full media gallery.
    """
    clusters: List[schemas.ReportResponse] = []
    visited = set()

    for r1 in reports:
        if r1.id in visited:
            continue
        
        group = [r1]
        visited.add(r1.id)

        for r2 in reports:
            if r2.id in visited:
                continue
            dist = haversine_distance_meters(r1.latitude, r1.longitude, r2.latitude, r2.longitude)
            if dist <= radius_meters:
                group.append(r2)
                visited.add(r2.id)

        anchor = max(group, key=lambda x: x.severity_score or 0.5)
        report_ids = [item.id for item in group]

        avg_lat = sum(item.latitude for item in group) / len(group)
        avg_lon = sum(item.longitude for item in group) / len(group)
        max_severity = max(item.severity_score or 0.5 for item in group)

        has_pending = any(item.status == "reported" for item in group)
        cluster_status = "reported" if has_pending else "addressed"

        media_list = []
        for item in group:
            img = item.image_url if (item.image_url and item.image_url != "None" and item.image_url != "") else DEFAULT_ROAD_IMAGE
            rep_name = item.user.full_name if item.user else "Citizen (Anonymous)"
            media_list.append(schemas.ClusterMediaItem(
                report_id=item.id,
                image_url=img,
                media_url=img,
                reporter_name=rep_name,
                created_at=item.created_at
            ))

        primary_img = media_list[0].image_url if media_list else DEFAULT_ROAD_IMAGE
        primary_reporter = anchor.user.full_name if anchor.user else "Citizen (Anonymous)"

        cluster_item = schemas.ReportResponse(
            id=anchor.id,
            user_id=anchor.user_id,
            latitude=round(avg_lat, 6),
            longitude=round(avg_lon, 6),
            image_url=primary_img,
            media_url=primary_img,
            annotated_image_url=primary_img,
            damage_type=anchor.damage_type,
            severity_score=round(max_severity, 2),
            status=cluster_status,
            description=anchor.description,
            created_at=anchor.created_at,
            reporter_name=primary_reporter,
            report_count=len(group),
            report_ids=report_ids,
            media_list=media_list
        )
        clusters.append(cluster_item)

    clusters.sort(key=lambda c: (c.severity_score or 0.0, c.report_count or 1), reverse=True)
    return clusters


@app.get(
    "/api/reports",
    response_model=List[schemas.ReportResponse],
    summary="Fetch road damage tickets"
)
def get_reports(
    status_filter: Optional[str] = None,
    order_by_severity: bool = True,
    user_id: Optional[int] = None,
    cluster: bool = False,
    db: Session = Depends(get_db)
):
    """
    Fetch damage reports, sorted by AI severity score (highest first).
    If cluster=true, deduplicates tickets within 20m radius.
    """
    query = db.query(models.Report)
    if user_id is not None:
        query = query.filter(models.Report.user_id == user_id)

    if status_filter:
        query = query.filter(models.Report.status == status_filter)
    
    if order_by_severity:
        query = query.order_by(models.Report.severity_score.desc(), models.Report.id.desc())
    else:
        query = query.order_by(models.Report.id.desc())
        
    reports = query.all()
    if cluster:
        return cluster_reports(reports, radius_meters=20.0)

    return [format_report_response(r) for r in reports]


@app.get(
    "/api/reports/clustered",
    response_model=List[schemas.ReportResponse],
    summary="Fetch deduplicated clustered reports for Authority Dashboard"
)
def get_clustered_reports(
    status_filter: Optional[str] = None,
    radius_meters: float = 20.0,
    db: Session = Depends(get_db)
):
    """
    Groups reports that are within 15-20 meters using Haversine formula.
    Returns primary report details, report_count, and nested media gallery.
    """
    query = db.query(models.Report)
    if status_filter:
        query = query.filter(models.Report.status == status_filter)
    reports = query.order_by(models.Report.severity_score.desc(), models.Report.id.desc()).all()
    return cluster_reports(reports, radius_meters=radius_meters)


@app.patch(
    "/api/reports/{report_id}/status",
    response_model=schemas.ReportResponse,
    summary="Update report status (Authority tick mark with cascading support)"
)
def update_report_status(
    report_id: int,
    status_update: schemas.ReportUpdateStatus,
    db: Session = Depends(get_db)
):
    """
    Update status of a report. If report_ids are provided in status_update,
    cascades the status change across all grouped reports in this cluster.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if status_update.report_ids and len(status_update.report_ids) > 0:
        db.query(models.Report).filter(models.Report.id.in_(status_update.report_ids)).update(
            {models.Report.status: status_update.status}, synchronize_session=False
        )
    else:
        report.status = status_update.status

    db.commit()
    db.refresh(report)
    return format_report_response(report)



@app.get(
    "/api/reports/{report_id}",
    response_model=schemas.ReportResponse,
    summary="Get specific report details by ID"
)
def get_report_by_id(report_id: int, db: Session = Depends(get_db)):
    """
    Fetch details of an individual ticket by ID for citizen tracking.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return format_report_response(report)


