# Authentication Setup

VitalityLens uses Keycloak as the identity provider. The `infra/docker-compose.yml` file provisions a Keycloak container that automatically seeds the `app` realm, core clients, and a demo login by importing `infra/keycloak/realm-export.json`. Follow the steps below to enable both local and Google authentication.

## Local Accounts

1. Start the stack with `docker compose -f infra/docker-compose.yml up keycloak db`.
2. Open the Keycloak admin console at `http://localhost:8080/admin`.
3. Log in using the credentials `admin` / `admin`.
4. A demo user (`demo` / `demoPass123!`) is created automatically. Create or edit users within the `app` realm as needed for your team.

## Google OAuth

1. Visit the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 Client ID (Web application).
3. Set authorized redirect URIs to `http://localhost/auth/realms/app/broker/google/endpoint`.
4. Copy the client ID and client secret.
5. In Keycloak, open the `app` realm and navigate to **Identity Providers**.
6. Select **Google** and provide the client ID/secret from Google Cloud.
7. Enable the provider and test login from the user-facing login page.

## Client Configuration

- `web-client`: Public client using Authorization Code Flow with PKCE.
- `core-api`: Confidential service accepting bearer tokens.

Update the `web-client` environment (e.g., `.env`) with:

```
VITE_KEYCLOAK_URL=http://localhost/auth
VITE_KEYCLOAK_REALM=app
VITE_KEYCLOAK_CLIENT_ID=web-client
```

The web app uses the Keycloak JavaScript adapter to initiate login, handle token refresh, and call the core API with bearer tokens.
