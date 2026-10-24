from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.gemini_service import transcribe_audio
from app.config import MAX_AUDIO_MB

router = APIRouter()

MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/wav",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/x-m4a",
    "audio/aac",
}


@router.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported audio type: {file.content_type}.",
        )

    audio_bytes = await file.read()

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large. Maximum allowed size is {MAX_AUDIO_MB} MB.",
        )

    try:
        mime = file.content_type or "audio/webm"
        transcribed = transcribe_audio(audio_bytes, mime_type=mime)
        return {"transcribed_text": transcribed}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
