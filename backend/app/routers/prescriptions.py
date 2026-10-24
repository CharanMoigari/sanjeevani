import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.prescription import Prescription
from app.schemas.prescription import (
    SimplifyRequest,
    SimplifyResponse,
    CreatePrescriptionRequest,
    CreatePrescriptionResponse,
    PrescriptionResponse,
    TranslateRequest,
    TranslateResponse,
)
from app.services.gemini_service import simplify_and_detect, translate_text
from app.services.qr_service import generate_qr_code
from app.config import FRONTEND_BASE_URL

router = APIRouter()


@router.post("/simplify", response_model=SimplifyResponse)
def simplify_prescription(req: SimplifyRequest):
    if not req.prescription_text.strip():
        raise HTTPException(status_code=400, detail="Prescription text cannot be empty.")
    try:
        result = simplify_and_detect(req.prescription_text.strip())
        return SimplifyResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI simplification failed: {str(e)}")


@router.post("/prescriptions", response_model=CreatePrescriptionResponse)
def create_prescription(req: CreatePrescriptionRequest, db: Session = Depends(get_db)):
    prescription_id = str(uuid.uuid4())
    patient_url = f"{FRONTEND_BASE_URL.rstrip('/')}/p/{prescription_id}"

    try:
        qr_image = generate_qr_code(patient_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QR generation failed: {str(e)}")

    prescription = Prescription(
        id=prescription_id,
        patient_name=req.patient_name.strip(),
        original_text=req.original_text.strip(),
        simplified_text=req.simplified_text.strip(),
        original_language=req.original_language,
    )
    try:
        db.add(prescription)
        db.commit()
        db.refresh(prescription)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return CreatePrescriptionResponse(
        prescription_id=prescription_id,
        qr_url=patient_url,
        qr_image=qr_image,
    )


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
def get_prescription(prescription_id: str, db: Session = Depends(get_db)):
    prescription = (
        db.query(Prescription).filter(Prescription.id == prescription_id).first()
    )
    if not prescription:
        raise HTTPException(
            status_code=404,
            detail=f"Prescription with id '{prescription_id}' not found.",
        )
    return PrescriptionResponse(
        id=prescription.id,
        patient_name=prescription.patient_name,
        original_text=prescription.original_text,
        simplified_text=prescription.simplified_text,
        original_language=prescription.original_language,
        created_at=prescription.created_at,
    )


@router.post("/translate", response_model=TranslateResponse)
def translate_prescription(req: TranslateRequest, db: Session = Depends(get_db)):
    prescription = (
        db.query(Prescription).filter(Prescription.id == req.prescription_id).first()
    )
    if not prescription:
        raise HTTPException(
            status_code=404,
            detail=f"Prescription '{req.prescription_id}' not found.",
        )
    try:
        translated = translate_text(prescription.simplified_text, req.target_language)
        return TranslateResponse(translated_text=translated)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
