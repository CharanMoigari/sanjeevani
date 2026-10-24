# AI Multilingual Prescription Assistant

A full-stack POC that lets doctors create AI-simplified prescriptions and patients read/hear them in their own language.

**Stack:** Next.js 15 · FastAPI · PostgreSQL (cloud) · Gemini AI

---

## Features

- **Doctor Portal** (`/doctor`): Type or dictate prescription → AI simplifies it → generates QR code
- **Patient Portal** (`/p/<id>`): Scan QR → select language → read + listen to prescription in Tamil, Telugu, Hindi, Kannada, or English

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| pnpm or npm | any recent |
| Gemini API key | [Google AI Studio](https://aistudio.google.com/) |
| Cloud PostgreSQL | Neon / Supabase / Cloud SQL |

---

## 1. Cloud Database Setup

You need a cloud PostgreSQL database. **No local Postgres or Docker database is needed.**

### Option A — Neon (Recommended, free tier)
1. Create an account at [neon.tech](https://neon.tech)
2. Create a new project → copy the **Connection string** (it looks like `postgresql://user:pass@host/dbname?sslmode=require`)
3. In the Neon SQL editor, run `schema.sql` (optional — tables are auto-created on backend startup)

### Option B — Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string → URI** tab
3. Copy the connection string; add `?sslmode=require` at the end if not present

### Option C — Any managed PostgreSQL
Copy the JDBC/connection string and convert to standard `postgresql://` format.

> **Password special characters:** If your password contains `@`, `#`, `/`, etc., URL-encode them before putting them in `DATABASE_URL`.  
> For example: `@` → `%40`, `#` → `%23`, `!` → `%21`

---

## 2. Backend Setup

```bash
cd backend

# Copy and fill in environment variables
cp .env.example .env
# Edit .env: set GEMINI_API_KEY, GEMINI_TEXT_MODEL, GEMINI_STT_MODEL,
#             GEMINI_TTS_MODEL, DATABASE_URL, FRONTEND_BASE_URL

# Create a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend
uvicorn app.main:app --reload --port 8000
```

**Verify:** Open [http://localhost:8000/health](http://localhost:8000/health) — you should see `{"status":"ok","db":"ok"}`.

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 3. Frontend Setup

```bash
cd frontend

# Copy and fill environment variables
cp .env.local.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL=http://localhost:8000

# Install dependencies
npm install    # or: pnpm install

# Start dev server
npm run dev    # runs on http://localhost:3000
```

Open [http://localhost:3000/doctor](http://localhost:3000/doctor) in your browser.

---

## 4. Full Flow Test — "Tab PCM 650 BD x 5D"

1. Open `http://localhost:3000/doctor`
2. Enter **Patient Name**: `Test Patient`
3. In **Prescription Text**, type: `Tab PCM 650 BD x 5D`
4. Click **✨ Simplify with AI**
5. You should see: *"Take one Paracetamol 650mg tablet twice daily for 5 days."*
6. Click **📱 Generate QR Code**
7. Scan the QR code with your phone **or** click **Open Patient Page**
8. Select **Tamil** → click **🌐 Translate**
9. Click **🔊 Listen Prescription**

---

## 5. LAN Phone Testing

To test the patient QR flow on your phone:

1. Find your machine's local IP: `ipconfig` (Windows) or `ifconfig` (macOS/Linux)
2. Update `backend/.env`:
   ```
   FRONTEND_BASE_URL=http://192.168.x.x:3000
   ALLOWED_ORIGINS=http://192.168.x.x:3000
   ```
3. Start the frontend binding to all interfaces:
   ```bash
   # In frontend/
   npm run dev -- --hostname 0.0.0.0
   ```
4. On your phone (same Wi-Fi), open `http://192.168.x.x:3000/doctor`

> ⚠️ **Microphone recording requires HTTPS in production.** On LAN (HTTP), most browsers still allow mic access on localhost; on a remote IP, you may need a self-signed cert or use the deployed URL.

---

## 6. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Gemini API key from Google AI Studio |
| `GEMINI_TEXT_MODEL` | Model for simplify/translate/detect (e.g. `gemini-1.5-flash-latest`) |
| `GEMINI_STT_MODEL` | Model for audio transcription (e.g. `gemini-1.5-flash-latest`) |
| `GEMINI_TTS_MODEL` | Model for TTS (e.g. `gemini-2.5-flash-preview-tts`) |
| `USE_GEMINI_TTS` | `true` = Gemini TTS, `false` = browser fallback |
| `DATABASE_URL` | Cloud PostgreSQL connection string |
| `FRONTEND_BASE_URL` | Base URL embedded in QR codes |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `MAX_AUDIO_MB` | Max audio upload size (default `10`) |
| `PORT` | Uvicorn port (default `8000`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (e.g. `http://localhost:8000`) |

---

## Project Structure

```
POC/
├── schema.sql                  # Optional: run manually in your cloud DB
├── README.md
├── DEPLOY.md
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, rate limiting, lifespan
│   │   ├── config.py           # All config from env vars
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── prescription.py # SQLAlchemy ORM model
│   │   ├── schemas/
│   │   │   └── prescription.py # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── health.py       # GET /health
│   │   │   ├── audio.py        # POST /upload-audio
│   │   │   ├── prescriptions.py # POST /simplify, /prescriptions, GET /prescriptions/{id}, POST /translate
│   │   │   └── tts.py          # POST /tts
│   │   └── services/
│   │       ├── gemini_service.py # STT, simplify, translate, TTS
│   │       └── qr_service.py    # QR code generation
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx        # Landing page
    │   │   ├── globals.css
    │   │   ├── doctor/
    │   │   │   └── page.tsx    # Doctor portal
    │   │   └── p/[id]/
    │   │       └── page.tsx    # Patient portal
    │   └── lib/
    │       ├── api.ts          # All backend API calls
    │       └── languages.ts    # Supported languages config
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── next.config.ts
    └── .env.local.example
```

