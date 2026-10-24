import os
import sys
from contextlib import asynccontextmanager

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import ALLOWED_ORIGINS
from app.database import Base, engine, DB_AVAILABLE
from app.routers import health, audio, prescriptions, tts

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    if DB_AVAILABLE and engine:
        try:
            Base.metadata.create_all(bind=engine)
            print("[OK] Database tables created/verified successfully.")
        except Exception as e:
            print(f"WARNING: Could not create/verify tables: {e}", file=sys.stderr)
    else:
        print(
            "WARNING: Database is not available. Tables will not be created.\n"
            "  → Set DATABASE_URL to your cloud PostgreSQL connection string.",
            file=sys.stderr,
        )
    yield


app = FastAPI(
    title="AI Multilingual Prescription Assistant",
    version="1.0.0",
    description="POC backend for multilingual prescription management with Gemini AI",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — origins come from env, never hardcoded to "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["Health"])
app.include_router(audio.router, tags=["Audio"])
app.include_router(prescriptions.router, tags=["Prescriptions"])
app.include_router(tts.router, tags=["TTS"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
