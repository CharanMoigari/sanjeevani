# Deployment Guide — AI Multilingual Prescription Assistant

> ⚠️ **Microphone recording requires HTTPS in production.** Make sure your deployed backend and frontend both use HTTPS URLs.  
> ⚠️ **Set `FRONTEND_BASE_URL` to your deployed frontend URL** so QR codes do not point to localhost.

---

## Overview

| Component | Platform | Notes |
|-----------|----------|-------|
| Database | Neon / Supabase / Cloud SQL | Cloud-managed PostgreSQL |
| Backend | Render (free tier) or Google Cloud Run | Docker-based FastAPI |
| Frontend | Vercel | Next.js — zero-config deploy |

---

## Step 1 — Cloud PostgreSQL

### Neon (Recommended)
1. Sign up at [neon.tech](https://neon.tech) → **Create Project**
2. Copy the **Connection string** from the dashboard (format: `postgresql://user:pass@host/dbname?sslmode=require`)
3. (Optional) Open the **SQL Editor** and paste `schema.sql` to pre-create tables.  
   The backend auto-creates tables on startup regardless.

> **Password special characters:** URL-encode any special chars in the password.  
> `@` → `%40` · `#` → `%23` · `!` → `%21` · `$` → `%24`

---

## Step 2 — Backend Deployment

### Option A: Render (Free/Starter)

1. Push the `backend/` folder to a GitHub repo (or the whole monorepo)
2. In [Render](https://render.com): **New → Web Service → Connect repo**
3. Set:
   - **Root directory**: `backend`
   - **Environment**: `Docker`
   - **Region**: Choose closest to your users
4. Add the following environment variables in Render's dashboard:

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | Your key from Google AI Studio |
| `GEMINI_TEXT_MODEL` | e.g. `gemini-1.5-flash-latest` |
| `GEMINI_STT_MODEL` | e.g. `gemini-1.5-flash-latest` |
| `GEMINI_TTS_MODEL` | e.g. `gemini-2.5-flash-preview-tts` |
| `USE_GEMINI_TTS` | `true` |
| `DATABASE_URL` | Your Neon/Supabase connection string |
| `FRONTEND_BASE_URL` | `https://your-app.vercel.app` (set after frontend deploy) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `PORT` | `8000` (Render injects `PORT` automatically; keep this aligned) |

5. Click **Deploy**. Render builds the Docker image and starts the service.
6. Note the Render service URL: `https://your-backend.onrender.com`

**Verify:** `curl https://your-backend.onrender.com/health`  
Should return: `{"status":"ok","db":"ok"}`

---

### Option B: Google Cloud Run

```bash
# 1. Build & push image
cd backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT/prescription-backend

# 2. Deploy
gcloud run deploy prescription-backend \
  --image gcr.io/YOUR_PROJECT/prescription-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY,\
GEMINI_TEXT_MODEL=gemini-1.5-flash-latest,\
GEMINI_STT_MODEL=gemini-1.5-flash-latest,\
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts,\
USE_GEMINI_TTS=true,\
DATABASE_URL=YOUR_CONNECTION_STRING,\
FRONTEND_BASE_URL=https://your-app.vercel.app,\
ALLOWED_ORIGINS=https://your-app.vercel.app
```

Note the Cloud Run service URL.

---

## Step 3 — Frontend Deployment (Vercel)

1. Push the `frontend/` folder to GitHub
2. In [Vercel](https://vercel.com): **Add New Project → Import repo**
3. Set **Root Directory** to `frontend`
4. Add environment variable:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` (Render) or your Cloud Run URL |

5. Click **Deploy**
6. Note your Vercel URL: `https://your-app.vercel.app`

---

## Step 4 — Update Backend CORS + QR URL

After you have both URLs, update the backend environment variables:

| Variable | Value |
|----------|-------|
| `FRONTEND_BASE_URL` | `https://your-app.vercel.app` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

**Redeploy the backend** after this change so QR codes contain the correct patient URL.

---

## Step 5 — Smoke Test End-to-End

1. Open `https://your-app.vercel.app/doctor`
2. Enter patient name: `Test Patient`
3. Type: `Tab PCM 650 BD x 5D` → **Simplify with AI**
4. **Generate QR Code** → scan with phone
5. On patient page: select **Tamil** → **Translate** → **Listen**

---

## Environment Variable Summary

### Backend (Render / Cloud Run)

```
GEMINI_API_KEY=...
GEMINI_TEXT_MODEL=gemini-1.5-flash-latest
GEMINI_STT_MODEL=gemini-1.5-flash-latest
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
USE_GEMINI_TTS=true
DATABASE_URL=postgresql://USER:PASS@HOST/DB?sslmode=require
FRONTEND_BASE_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
MAX_AUDIO_MB=10
PORT=8000
```

### Frontend (Vercel)

```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| Mic not working on phone | Deploy with HTTPS — browsers block mic on HTTP (non-localhost) |
| QR code points to localhost | Set `FRONTEND_BASE_URL` to deployed Vercel URL and redeploy backend |
| DB connection errors | Check `DATABASE_URL` format; ensure password special chars are URL-encoded |
| CORS errors | Add frontend URL to `ALLOWED_ORIGINS` and redeploy backend |
| TTS no audio | Check `GEMINI_TTS_MODEL` env var; browser fallback activates automatically |
| Cold start slow (Render free) | Render free tier sleeps after 15 min; first request may take ~30s |

