import os
import shutil
import uuid
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

app = FastAPI(
    title="Road-Ranger API",
    description="AI-Enabled Road Damage Reporting & Detection API",
    version="1.0.0"
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
        "docs_url": "/docs"
    }


@app.post("/api/upload")
async def upload_media(file: UploadFile = File(...)):
    """
    Accepts photo or video uploads from citizens and stores them locally.
    Returns the media URL for inclusion in the report submission.
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
    return {"image_url": media_url, "filename": file.filename}


@app.post(
    "/api/reports",
    response_model=schemas.ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new road damage report"
)
def create_report(report_in: schemas.ReportCreate, db: Session = Depends(get_db)):
    """
    Submit new road damage report with coordinates, damage type, severity score, and optional media.
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

    db_report = models.Report(
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        image_url=report_in.image_url,
        damage_type=report_in.damage_type,
        severity_score=severity,
        status=report_in.status or "reported",
        description=report_in.description
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


@app.get(
    "/api/reports",
    response_model=List[schemas.ReportResponse],
    summary="Fetch all road damage tickets"
)
def get_reports(
    status_filter: Optional[str] = None,
    order_by_severity: bool = True,
    db: Session = Depends(get_db)
):
    """
    Fetch all damage reports, sorted by AI severity score (highest first) for authority prioritization.
    """
    query = db.query(models.Report)
    if status_filter:
        query = query.filter(models.Report.status == status_filter)
    
    if order_by_severity:
        query = query.order_by(models.Report.severity_score.desc(), models.Report.id.desc())
    else:
        query = query.order_by(models.Report.id.desc())
        
    return query.all()


@app.patch(
    "/api/reports/{report_id}/status",
    response_model=schemas.ReportResponse,
    summary="Update report status (Authority tick mark)"
)
def update_report_status(
    report_id: int,
    status_update: schemas.ReportUpdateStatus,
    db: Session = Depends(get_db)
):
    """
    Update status of a report (e.g. 'addressed', 'in_progress', 'resolved').
    Simulates authority action and trigger notification.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.status = status_update.status
    db.commit()
    db.refresh(report)
    return report
