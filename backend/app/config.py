import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in backend directory, current working dir, and parent dirs
_env_in_backend = Path(__file__).resolve().parent.parent / ".env"
if _env_in_backend.exists():
    load_dotenv(dotenv_path=_env_in_backend)
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-1.5-flash")
GEMINI_STT_MODEL = os.getenv("GEMINI_STT_MODEL", "gemini-1.5-flash")
GEMINI_TTS_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")
USE_GEMINI_TTS = os.getenv("USE_GEMINI_TTS", "true").lower() == "true"
DATABASE_URL = os.getenv("DATABASE_URL", "")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]
MAX_AUDIO_MB = int(os.getenv("MAX_AUDIO_MB", "10"))
