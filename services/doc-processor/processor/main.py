import asyncio
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List

import httpx
from minio import Minio
from sqlalchemy import JSON, Column, DateTime, String, Text, create_engine, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Session, declarative_base, sessionmaker

POLL_INTERVAL_SECONDS = int(os.getenv("PROCESSOR_POLL_INTERVAL", "30"))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://appuser:apppassword@db:5432/appdb")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "medical-docs")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai-service:8000")

Base = declarative_base()


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), nullable=False)
    metadata_raw = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)
    extracted_data = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_recommendations = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)


@dataclass
class ExtractedTest:
    name: str
    value: float | None
    unit: str | None
    ref_low: float | None
    ref_high: float | None


class DocumentProcessor:
    def __init__(self) -> None:
        self.engine = create_engine(DATABASE_URL, future=True)
        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False, future=True)
        endpoint_host = MINIO_ENDPOINT.replace("https://", "").replace("http://", "")
        self.storage = Minio(
            endpoint_host,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_ENDPOINT.startswith("https"),
        )
        self.bucket = MINIO_BUCKET
        self.fhir_base_url = os.getenv("FHIR_BASE_URL", "http://fhir-server:8080/fhir")
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        if not self.storage.bucket_exists(self.bucket):
            self.storage.make_bucket(self.bucket)

    def run(self) -> None:
        while True:
            try:
                self.process_next()
            except Exception as exc:  # pragma: no cover
                print(f"Processor error: {exc}")
            time.sleep(POLL_INTERVAL_SECONDS)

    def process_next(self) -> None:
        with self.SessionLocal() as session:
            document = (
                session.query(Document)
                .filter(Document.status == "pending")
                .order_by(Document.created_at.asc())
                .first()
            )
            if not document:
                return

            try:
                self._process_document(session, document)
            except Exception as exc:
                document.status = "error"
                session.add(document)
                session.commit()
                print(f"Failed to process document {document.id}: {exc}")

    def _process_document(self, session: Session, document: Document) -> None:
        response = self.storage.get_object(self.bucket, document.storage_key)
        try:
            data = response.read()
        finally:
            response.close()
            response.release_conn()

        text = self._extract_text(data, document.original_filename)
        tests = self._parse_tests(text)
        structured = {
            "raw_text": text,
            "tests": [test.__dict__ for test in tests],
        }

        summary = asyncio.run(self._call_ai(structured))
        self._sync_to_fhir(document, structured)
        document.status = "processed"
        document.extracted_data = structured
        document.ai_summary = summary.get("summary")
        document.ai_recommendations = summary.get("recommendations")
        session.add(document)
        session.commit()

    def _extract_text(self, data: bytes, filename: str) -> str:
        try:
            return data.decode("utf-8")
        except UnicodeDecodeError:
            return ""

    def _parse_tests(self, text: str) -> List[ExtractedTest]:
        pattern = re.compile(r"(?P<name>[A-Za-z ]+)\s+(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>[A-Za-z/%]+)?")
        tests: List[ExtractedTest] = []
        for match in pattern.finditer(text):
            value = float(match.group("value")) if match.group("value") else None
            tests.append(
                ExtractedTest(
                    name=match.group("name").strip(),
                    value=value,
                    unit=match.group("unit"),
                    ref_low=None,
                    ref_high=None,
                )
            )
        return tests

    async def _call_ai(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{AI_SERVICE_URL}/analyze/lab-report", json=payload)
            response.raise_for_status()
            return response.json()

    def _sync_to_fhir(self, document: Document, structured: Dict[str, Any]) -> None:
        """Placeholder for synchronizing results to the FHIR server."""
        if not self.fhir_base_url:
            return
        # Future implementation will map `structured` results into Observation and DiagnosticReport
        # resources and POST them to the configured FHIR server.


def main() -> None:
    processor = DocumentProcessor()
    processor.run()


if __name__ == "__main__":
    main()
