# VitalityLens API

Base URL: `/api`

All endpoints require a bearer access token issued by Keycloak.

## Authentication

The core API validates JWTs issued by the `app` realm. Tokens must include the `sub` claim, which maps to the application user identifier.

## Documents

### POST `/api/documents`
Upload a PDF or image document.

**Request**
- Content-Type: `multipart/form-data`
- Fields:
  - `file` (required): PDF, JPEG, or PNG file.
  - `metadata` (optional, JSON string): Additional tags such as `type` or `notes`.

**Response** `201 Created`
```
{
  "id": "uuid",
  "user_id": "user-sub",
  "status": "pending",
  "original_filename": "report.pdf",
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

### GET `/api/documents`
List the authenticated user's documents.

**Response**
```
[
  {
    "id": "uuid",
    "status": "processed",
    "original_filename": "report.pdf",
    "uploaded_at": "2024-01-01T00:00:00Z",
    "ai_summary": "Your LDL is above..."
  }
]
```

### GET `/api/documents/{id}`
Retrieve a single document with metadata and status.

### GET `/api/documents/{id}/extracted`
Return the structured extraction payload.

### GET `/api/documents/{id}/summary`
Return the AI-generated summary and recommendations.

## Internal Webhooks (Future)

- `/internal/processor/callback` – placeholder for doc-processor status updates (not yet implemented).
