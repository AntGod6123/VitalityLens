import os
from typing import Any, Dict, List

import httpx


class FHIRClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("FHIR_BASE_URL", "http://fhir-server:8080/fhir").rstrip("/")

    async def create_resource(self, resource_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/{resource_type}", json=payload)
            response.raise_for_status()
            return response.json()

    async def search(self, resource_type: str, params: Dict[str, str]) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/{resource_type}", params=params)
            response.raise_for_status()
            return response.json()


def get_fhir_client() -> FHIRClient:
    return FHIRClient()
