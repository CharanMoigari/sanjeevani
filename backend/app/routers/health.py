from fastapi import APIRouter
from sqlalchemy import text
from app.database import DB_AVAILABLE, engine
from app.schemas.prescription import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check():
    db_status = "unavailable"
    if DB_AVAILABLE and engine:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_status = "ok"
        except Exception as e:
            db_status = f"error: {str(e)}"
    return HealthResponse(status="ok", db=db_status)
