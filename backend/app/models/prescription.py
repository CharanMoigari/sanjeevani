import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from app.database import Base

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_name = Column(Text, nullable=False)
    original_text = Column(Text, nullable=False)
    simplified_text = Column(Text, nullable=False)
    original_language = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
