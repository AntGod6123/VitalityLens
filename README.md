# VitalityLens

VitalityLens is a containerized platform for uploading, processing, and summarizing medical documents. The system uses Keycloak for authentication (local + Google), FastAPI for the core backend, a document processing worker for OCR and extraction, and a React frontend for user interaction.

## Getting Started

1. Ensure Docker and Docker Compose are installed.
2. Copy `web-client/.env.example` to `web-client/.env` and update the Keycloak URL if necessary.
3. Launch the stack:

```bash
docker compose -f infra/docker-compose.yml up --build
```

4. Access the web application at `http://localhost` and Keycloak admin console at `http://localhost:8080/admin`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/AUTH_SETUP.md`](docs/AUTH_SETUP.md) for deeper setup instructions.
