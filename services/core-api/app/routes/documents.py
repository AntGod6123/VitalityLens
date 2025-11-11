import io
import json
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document, DocumentStatusEnum
from app.schemas.document import (
    DocumentDetail,
    DocumentExtraction,
    DocumentListItem,
    DocumentSummary,
)
from app.utils.storage import get_storage

router = APIRouter(prefix="/documents", tags=["documents"])


def _generate_storage_key(user_id: str, filename: str) -> str:
    extension = filename.split(".")[-1] if "." in filename else "bin"
    return f"{user_id}/{uuid.uuid4()}.{extension}"


@router.post("", response_model=DocumentDetail, status_code=status.HTTP_201_CREATED)
async def upload_document(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    metadata: str | None = None,
):
    if file.content_type not in {"application/pdf", "image/jpeg", "image/png"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    storage = get_storage()
    original_name = file.filename or "upload.bin"
    storage_key = _generate_storage_key(current_user["sub"], original_name)

    content = await file.read()
    storage.upload(storage_key, io.BytesIO(content), length=len(content), content_type=file.content_type)

    metadata_payload = None
    if metadata:
        try:
            metadata_payload = json.loads(metadata)
        except json.JSONDecodeError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid metadata JSON")

    document = Document(
        user_id=current_user["sub"],
        storage_key=storage_key,
        original_filename=original_name,
        status=DocumentStatusEnum.PENDING,
        metadata_raw=metadata_payload,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return document


@router.get("", response_model=List[DocumentListItem])
async def list_documents(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    records = (
        db.query(Document)
        .filter(Document.user_id == current_user["sub"])
        .order_by(Document.created_at.desc())
        .all()
    )
    return records


@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document(document_id: uuid.UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user["sub"])
        .first()
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("/{document_id}/extracted", response_model=DocumentExtraction)
async def get_document_extraction(document_id: uuid.UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user["sub"])
        .first()
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentExtraction(extracted_data=document.extracted_data)


@router.get("/{document_id}/summary", response_model=DocumentSummary)
async def get_document_summary(document_id: uuid.UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user["sub"])
        .first()
    )
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentSummary(summary=document.ai_summary, recommendations=document.ai_recommendations)
