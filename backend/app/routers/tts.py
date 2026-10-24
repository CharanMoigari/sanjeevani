import sys
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.schemas.prescription import TTSRequest
from app.services.gemini_service import text_to_speech
from app.config import USE_GEMINI_TTS

router = APIRouter()


@router.post("/tts")
def tts_endpoint(req: TTSRequest):
    if not USE_GEMINI_TTS:
        raise HTTPException(
            status_code=503,
            detail="Gemini TTS is disabled (USE_GEMINI_TTS=false). Use browser SpeechSynthesis fallback.",
        )
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    try:
        wav_bytes = text_to_speech(req.text.strip(), req.language)
        return Response(content=wav_bytes, media_type="audio/wav")
    except ValueError as e:
        print(f"TTS Configuration Error: {e}", file=sys.stderr)
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"TTS Generation Error: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
