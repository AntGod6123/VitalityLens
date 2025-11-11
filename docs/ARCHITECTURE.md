# VitalityLens Architecture

VitalityLens is composed of multiple services orchestrated via Docker Compose. The platform enables secure upload, processing, and summarization of medical documents.

## Services Overview

- **reverse-proxy**: Nginx gateway that exposes the web UI, API, and Keycloak endpoints.
- **keycloak**: Identity provider handling local and Google OAuth logins using OpenID Connect.
- **db**: PostgreSQL database storing application metadata and document records.
- **minio**: Object storage for raw document binaries.
- **fhir-server**: HAPI FHIR JPA server storing structured clinical data.
- **core-api**: FastAPI backend that authenticates requests, manages uploads, and surfaces structured results.
- **doc-processor**: Background worker that runs OCR, extracts lab results, and orchestrates FHIR + AI updates.
- **ai-service**: Stubbed AI summarization service that can be swapped for a production LLM backend.
- **web-client**: React frontend for authentication, document management, and insights.

All services connect via the `app-net` Docker network. Only the reverse proxy and optional Keycloak HTTPS port are exposed externally.

## Data Flow

1. Users authenticate with Keycloak via the web client.
2. Uploaded documents are persisted to MinIO and a record is inserted into PostgreSQL via the core API.
3. The document processor polls for pending documents, downloads binaries from MinIO, performs OCR and extraction, persists structured FHIR resources, and calls the AI service for summaries.
4. Processed results are written back to the core API database for quick retrieval by the frontend.

## Security Considerations

- All API requests must include a bearer token issued by Keycloak.
- MinIO credentials are scoped to the application and should be rotated regularly.
- FHIR resources are associated with users via an internal mapping table, ensuring per-user data segregation.

## Extensibility

- Swap the AI service implementation to integrate hosted or on-prem LLM solutions.
- Extend the document processor with advanced extraction models.
- Integrate audit logging or observability stacks by extending the Docker Compose file.
