# Road-Ranger 🛣️
**PWD-01: AI-Based Road Damage Reporting & Detection System**

[![Live Demo](https://img.shields.io/badge/Live_Deployment-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://road-ranger.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/anishas0501-hub/Road-Ranger)

🌐 **Live Deployment URL**: **[https://road-ranger.vercel.app/](https://road-ranger.vercel.app/)**

Road-Ranger is an AI-enabled civic infrastructure reporting and municipal decision-support system developed for citizens and the Public Works Department (PWD). Citizens report road hazards (potholes, cracks, drainage failures) with live satellite GPS pinning and image/video uploads, while PWD authorities review AI-prioritized repair tickets, inspect high-resolution multi-image galleries, and dispatch automated progress notifications.

---

## 🌟 Key Features

### 👤 Citizen Portal
- **Bilingual Interface**: Seamless one-click toggle between **English** and **Manipuri (মৈতৈলোন্)**.
- **Citizen Authentication**:
  - Secure registration with Mobile OTP verification (demo code: `123456`).
  - Login via Full Name, Mobile Number, or Username + Password.
- **3-Section Navigation Bar**:
  1. **Report Road Damage**:
     - Defect categories: Pothole, Surface Crack, Drainage System Failure, Soil Erosion, Others.
     - Live satellite GPS geolocation locking (`latitude`, `longitude`, `accuracy`) with Google Maps pinpointing.
     - Camera/Video upload with real-time AI vision scanning animation and defect classification.
     - 250-character limit counter for concise, actionable descriptions.
     - Instant **+50 Civic Reward Points** automatically credited upon verified submission.
  2. **Track Existing Reports**:
     - Real-time ticket status tracking (`#PWD-RR-<ID>`) with live polling for authority updates.
     - Status indicators: *Reported • In Queue* vs *Addressed by PWD*.
     - Automated official notification banner upon authority action.
  3. **User Dashboard**:
     - Citizen profile showing Full Name, Mobile Number, and Total Reward Points.
     - Circular profile avatar with dynamic image upload.
     - Civic impact summary and points breakdown.

---

### 🛡️ Authority Portal & AI Dashboard
- **Multi-Factor Verification**:
  - Official PWD email (`@pwd.gov.in`) + Password.
  - PWD Officer Badge Identifier (e.g. `PWD-MN-4091`) or 6-digit Gov 2FA OTP token.
- **Geographic Deduplication & Clustering (Haversine Formula)**:
  - Automatically clusters duplicate citizen complaints within a **20-meter radius**.
  - Prominently displays citizen report counts (e.g. *Reported by 4 citizens*).
  - Multi-image gallery with `+N` badge overlay for clustered reports.
- **Full-Screen Media Lightbox Carousel**:
  - Click any thumbnail to inspect high-resolution citizen evidence.
  - Swipe or click left/right arrows (`‹` / `›` or keyboard `←` / `→`) to browse all photos associated with that defect cluster.
  - Close with `Esc` or the close button.
- **Dynamic Action Button & Cascade Updates**:
  - Toggle between **"Mark as Addressed"** (white state) and **"Addressed (Click to Revert)"** (green state).
  - Status updates cascade to all reports in the cluster so every reporting citizen receives automated notification notices:
    > *"Good job! Your complaint has been noticed and actions will be taken within 4-6 business days."*

---

## 🗄️ Database Architecture (SQLAlchemy & SQLite)

The SQLite database (`road_ranger.db`) maintains relational integrity between citizens and tickets:

### `users` Table
| Field | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Unique citizen identifier |
| `full_name` | String | Citizen legal full name |
| `mobile_number` | String (Unique) | 10-digit mobile number |
| `username` | String (Unique) | Unique citizen username |
| `password_hash` | String | Secure SHA-256 hashed password |
| `profile_photo_url` | String | Profile avatar image URL |
| `reward_points` | Integer | Total accumulated civic reward points (default: 0) |
| `created_at` | DateTime | Timestamp of user registration |

### `reports` Table
| Field | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Unique report ticket identifier |
| `user_id` | Integer (FK) | References `users.id` (nullable for legacy/anonymous) |
| `latitude` | Float | Geolocation latitude coordinate |
| `longitude` | Float | Geolocation longitude coordinate |
| `image_url` | String | Uploaded defect photo/video URL or asset reference |
| `damage_type` | String | Type of road defect (e.g. Pothole, Crack, Drainage) |
| `severity_score` | Float | AI predicted hazard score (0.0 to 1.0) |
| `status` | String | Default: `'reported'`, updated to `'addressed'` upon authority action |
| `description` | Text | Citizen details / nearby landmark |
| `created_at` | DateTime | Timestamp of ticket submission |

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- API Docs (Swagger UI): `http://127.0.0.1:8000/docs`

#### Key REST Endpoints:
- `POST /api/auth/send-otp`: Request mock 6-digit OTP.
- `POST /api/auth/register`: Register new citizen account.
- `POST /api/auth/login`: Authenticate citizen.
- `POST /api/reports`: Submit new damage report (+50 points).
- `GET /api/reports?cluster=true`: Fetch deduplicated clustered reports for authority.
- `GET /api/reports/clustered`: Dedicated geographic clustering endpoint (20m radius).
- `PATCH /api/reports/{id}/status`: Cascade update status across a cluster.
- `POST /api/upload`: Upload media file & run YOLOv8 defect inference.

### 3. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔐 Demo Credentials

### Citizen Portal:
- **Username**: `citizen_demo`
- **Password**: `DemoPassword#123`
- *(Or register any mobile number using dummy OTP: `123456`)*

### Authority Command Center:
- **Official Email**: `officer@pwd.gov.in`
- **Password**: `GovSecure#2026`
- **Officer Badge ID**: `PWD-MN-4091` *(or 6-Digit 2FA OTP: `849201`)*

---

## ☁️ Deployment

- **Frontend**: Deployed on [Vercel](https://road-ranger.vercel.app/) with automated CI/CD and SPA rewrites (`vercel.json`).
- **Live URL**: [https://road-ranger.vercel.app/](https://road-ranger.vercel.app/)
