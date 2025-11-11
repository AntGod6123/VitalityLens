from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel


class DocumentBase(BaseModel):
    id: UUID
    user_id: str
    status: str
    original_filename: str
    created_at: datetime
    updated_at: datetime
    metadata_raw: Optional[dict[str, Any]] = None
    ai_summary: Optional[str] = None
    ai_recommendations: Optional[List[str]] = None

    class Config:
        from_attributes = True


class DocumentCreateResponse(DocumentBase):
    storage_key: str


class DocumentDetail(DocumentBase):
    extracted_data: Optional[dict[str, Any]] = None


class DocumentListItem(BaseModel):
    id: UUID
    status: str
    original_filename: str
    created_at: datetime
    updated_at: datetime
    ai_summary: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentSummary(BaseModel):
    summary: Optional[str]
    recommendations: Optional[List[str]]


class DocumentExtraction(BaseModel):
    extracted_data: Optional[dict[str, Any]]
