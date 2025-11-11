import os
import time
from functools import lru_cache
from typing import Any, Dict

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from jose.utils import base64url_decode

HTTP_BEARER = HTTPBearer(auto_error=False)


class TokenVerifier:
    def __init__(self, issuer_url: str):
        self.issuer_url = issuer_url.rstrip("/")
        self._jwks: Dict[str, Any] | None = None
        self._jwks_expiry = 0.0

    async def _load_jwks(self) -> Dict[str, Any]:
        if self._jwks and time.time() < self._jwks_expiry:
            return self._jwks

        async with httpx.AsyncClient() as client:
            oidc_config = await client.get(f"{self.issuer_url}/.well-known/openid-configuration")
            oidc_config.raise_for_status()
            jwks_uri = oidc_config.json()["jwks_uri"]
            response = await client.get(jwks_uri)
            response.raise_for_status()
            body = response.json()

        self._jwks = {key["kid"]: key for key in body.get("keys", [])}
        self._jwks_expiry = time.time() + 3600
        return self._jwks

    async def verify(self, token: str) -> Dict[str, Any]:
        jwks = await self._load_jwks()
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        if kid not in jwks:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header")

        key = jwks[kid]
        message, encoded_signature = token.rsplit('.', 1)
        decoded_signature = base64url_decode(encoded_signature.encode())

        rsa_key = jwk.construct(key)
        if not rsa_key.verify(message.encode(), decoded_signature):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")

        try:
            payload = jwt.get_unverified_claims(token)
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

        if payload.get("iss") != self.issuer_url:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid issuer")

        exp = payload.get("exp")
        if exp and time.time() > exp:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

        return payload


@lru_cache(maxsize=1)
def get_token_verifier() -> TokenVerifier:
    issuer = os.getenv("OIDC_ISSUER_URL", "http://keycloak:8080/realms/app")
    return TokenVerifier(issuer_url=issuer)


async def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(HTTP_BEARER)) -> Dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

    verifier = get_token_verifier()
    payload = await verifier.verify(credentials.credentials)

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    return {"sub": subject, "token": credentials.credentials, "claims": payload}
