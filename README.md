# Road-Ranger 🛣️
**PWD-01: AI-Based Road Damage Reporting & Detection System**

Road-Ranger is a full-stack civic reporting and municipal decision-support platform designed for citizens and the Public Works Department (PWD). Citizens can capture road defects with live satellite GPS pinning and photos/videos, while PWD authorities review AI-prioritized repair tickets, inspect high-resolution media, and dispatch automated progress notifications.

---

## 🌟 Key Features

### 👤 Citizen Portal
- **Bilingual Interface**: Seamless one-click toggle between **English** and **Manipuri (মৈতৈলোন্)**.
- **Categorized Defect Selection**:
  - Pothole (খোংহাম)
  - Road Surface Crack (লম্বী অহাকপা)
  - Drainage System Failure (ঈথাই/ড্রেনেজ মাংবা)
  - Soil Erosion / Edge Collapse (লৈহাও চাইখ্রবা)
  - Custom ("Other" with dynamic specification textbox)
- **Live GPS Geolocation**: Locks real-time satellite coordinates (`latitude`, `longitude`, `accuracy`) immediately upon reporting or media capture, with Google Maps pinpoint integration.
- **Photo / Video Media Upload**: Supports `.jpg`, `.png`, `.mp4` uploads with real-time preview and simulated AI defect vision scanning.
- **Character Counter**: Restricts comments to 250 characters for crisp, actionable municipal tickets.
- **Civic Gamification & Tracking**: Awards Civic Impact Points (+25 pts) and provides an instant Ticket Tracking Reference (`#PWD-RR-<ID>`).

### 🛡️ Authority Portal & AI Dashboard
- **Secure Multi-Factor Verification**:
  - Official Gov Email (`@pwd.gov.in`) + Password
  - Third-factor PWD Officer Badge Identifier (e.g. `PWD-MN-4091`) or Gov 6-Digit OTP token.
- **AI Severity Prioritization**: Incoming reports are automatically ranked by their AI severity score (high accident risk tickets float to the top).
- **Full-Screen Media Inspection**: Click any photo or video thumbnail to open a high-resolution inspection modal.
- **Authority Tick Mark Action (`✓`)**:
  - Highway engineers click to acknowledge tickets.
  - Automatically sends status updates (`PATCH /api/reports/{id}/status`).
  - Triggers the automated citizen feedback notification:
    > *"Good job! Your complaint has been noticed and actions will be taken within 4-6 business days."*

---

## 🗄️ Database Architecture (SQLAlchemy & SQLite)

The SQLite database (`road_ranger.db`) stores reports according to the specification:

| Field | Type | Description |
|---|---|---|
| `id` | Integer (Primary Key) | Unique report ticket identifier |
| `latitude` | Float | Geolocation latitude coordinate |
| `longitude` | Float | Geolocation longitude coordinate |
| `image_url` | String | Uploaded photo/video URL or asset reference |
| `damage_type` | String | Type of road defect (e.g. Pothole, Crack, Drainage) |
| `severity_score` | Float | AI predicted hazard score (0.0 to 1.0) |
| `status` | String | Default: `'reported'`, updated to `'addressed'` upon authority action |
| `description` | Text | Citizen details / nearby landmark |
| `created_at` | DateTime | Timestamp of ticket submission |

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- API Docs (Swagger UI): `http://127.0.0.1:8000/docs`
- Root Healthcheck: `http://127.0.0.1:8000/`

#### REST Endpoints:
- `POST /api/reports`: Submit new damage report.
- `GET /api/reports`: Fetch all tickets sorted by AI severity score.
- `PATCH /api/reports/{id}/status`: Update ticket status (e.g. `addressed`).
- `POST /api/upload`: Upload road defect photo or video file.

---

### 3. Frontend Setup (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔐 Demo Credentials (Authority Login)
- **Official Email**: `officer@pwd.gov.in`
- **Password**: `GovSecure#2026`
- **Officer Badge ID**: `PWD-MN-4091` *(or 6-Digit OTP: `849201`)*
