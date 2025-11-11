import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.types import JSON

from app.db.session import Base


class DocumentStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    ERROR = "error"


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    storage_key = Column(String, nullable=False, unique=True)
    original_filename = Column(String, nullable=False)
    status = Column(String, nullable=False, default=DocumentStatusEnum.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    metadata_raw = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)
    extracted_data = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_recommendations = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)

    def mark_processed(self, extracted: Optional[dict], summary: Optional[str], recommendations: Optional[list[str]]) -> None:
        self.status = DocumentStatusEnum.PROCESSED.value
        self.extracted_data = extracted
        self.ai_summary = summary
        self.ai_recommendations = recommendations or []
        self.updated_at = datetime.utcnow()
