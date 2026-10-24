import base64
import wave
import io
from google import genai
from google.genai import types
from app.config import (
    GEMINI_API_KEY, GEMINI_TEXT_MODEL, GEMINI_STT_MODEL,
    GEMINI_TTS_MODEL, USE_GEMINI_TTS
)

LANGUAGE_VOICES = {
    "English": "Kore",
    "Tamil": "Leda",
    "Telugu": "Aoede",
    "Hindi": "Charon",
    "Kannada": "Fenrir",
}


def get_client() -> genai.Client:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")
    return genai.Client(api_key=GEMINI_API_KEY)


def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """Use Gemini to transcribe audio to text."""
    client = get_client()
    audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
    response = client.models.generate_content(
        model=GEMINI_STT_MODEL,
        contents=[
            audio_part,
            "Transcribe this audio recording exactly. Return only the transcribed text, nothing else.",
        ],
    )
    return response.text.strip()


def simplify_and_detect(prescription_text: str) -> dict:
    """Simplify prescription text and detect language. Returns dict with simplified_text and detected_language."""
    client = get_client()

    # Step 1: Detect language
    lang_response = client.models.generate_content(
        model=GEMINI_TEXT_MODEL,
        contents=[
            f"""Detect the language of the following medical prescription text.
Return ONLY one of these exact values: English, Tamil, Telugu, Hindi, Kannada
Do not include any explanation or punctuation.

Text: {prescription_text}"""
        ],
    )
    detected_language = lang_response.text.strip()
    valid_langs = {"English", "Tamil", "Telugu", "Hindi", "Kannada"}
    if detected_language not in valid_langs:
        detected_language = "English"

    # Step 2: Simplify
    simplify_prompt = f"""You are a medical prescription assistant.
Convert the following prescription into patient-friendly language.
Rules:
- Expand abbreviations (e.g., BD = twice daily, TDS = three times a day, OD = once daily, SOS = as needed, AC = before meals, PC = after meals, HS = at bedtime, Tab = Tablet, Cap = Capsule, Syr = Syrup, x = for).
- Keep medicine names unchanged.
- Keep dosage numbers and units unchanged.
- Simplify instructions into plain everyday language.
- Do not invent medical information.
- Return only the simplified prescription text, no extra commentary.

Prescription:
{prescription_text}"""

    simplify_response = client.models.generate_content(
        model=GEMINI_TEXT_MODEL,
        contents=[simplify_prompt],
    )
    simplified_text = simplify_response.text.strip()

    return {"simplified_text": simplified_text, "detected_language": detected_language}


def translate_text(text: str, target_language: str) -> str:
    """Translate text to the target language. Returns original text if English."""
    if target_language == "English":
        return text

    client = get_client()
    prompt = f"""Translate the following medical prescription explanation into {target_language}.

Rules:
- Translate only. Keep medicine brand names and generic names exactly as they appear — do not translate or change them.
- Keep dosage numbers and units unchanged (e.g., 650mg, twice daily).
- Do not add or remove any medical information.
- Use simple, everyday words suitable for a patient.
- Return only the translated text, no extra commentary.

Text to translate:
{text}"""

    response = client.models.generate_content(
        model=GEMINI_TEXT_MODEL,
        contents=[prompt],
    )
    return response.text.strip()


def _pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, sampwidth: int = 2) -> bytes:
    """Wrap raw PCM bytes in a proper WAV container."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sampwidth)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()


def text_to_speech(text: str, language: str) -> bytes:
    """Generate TTS audio using Gemini TTS. Returns WAV bytes."""
    client = get_client()
    voice_name = LANGUAGE_VOICES.get(language, "Kore")

    # Resolve common model names and aliases
    model_name = (GEMINI_TTS_MODEL or "").strip()
    if model_name == "gemini-3.1-flash-tts":
        model_name = "gemini-3.1-flash-tts-preview"
    elif not model_name:
        model_name = "gemini-3.1-flash-tts-preview"

    response = client.models.generate_content(
        model=model_name,
        contents=text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice_name,
                    )
                )
            ),
        ),
    )

    # Extract audio bytes
    part = response.candidates[0].content.parts[0]
    audio_data = part.inline_data.data
    if isinstance(audio_data, str):
        audio_data = base64.b64decode(audio_data)

    # If already WAV (RIFF header), return as-is; otherwise wrap PCM
    if audio_data[:4] == b"RIFF":
        return audio_data
    return _pcm_to_wav(audio_data, sample_rate=24000)
