from datetime import datetime
from pydantic import BaseModel, Field

class SimplifyRequest(BaseModel):
    prescription_text: str = Field(..., min_length=1, max_length=5000)

class SimplifyResponse(BaseModel):
    simplified_text: str
    detected_language: str

class CreatePrescriptionRequest(BaseModel):
    patient_name: str = Field(..., min_length=1, max_length=200)
    original_text: str = Field(..., min_length=1, max_length=5000)
    simplified_text: str = Field(..., min_length=1, max_length=5000)
    original_language: str = Field(..., min_length=1, max_length=50)

class PrescriptionResponse(BaseModel):
    id: str
    patient_name: str
    original_text: str
    simplified_text: str
    original_language: str
    created_at: datetime

class CreatePrescriptionResponse(BaseModel):
    prescription_id: str
    qr_url: str
    qr_image: str  # base64 data URL

class TranslateRequest(BaseModel):
    prescription_id: str
    target_language: str = Field(..., pattern="^(English|Tamil|Telugu|Hindi|Kannada)$")

class TranslateResponse(BaseModel):
    translated_text: str

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    language: str = Field(..., pattern="^(English|Tamil|Telugu|Hindi|Kannada)$")

class HealthResponse(BaseModel):
    status: str
    db: str
