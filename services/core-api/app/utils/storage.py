import os
from typing import BinaryIO

from functools import lru_cache

from minio import Minio


class MinioStorage:
    def __init__(self) -> None:
        endpoint = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        secure = endpoint.startswith("https")

        # strip protocol for Minio client
        endpoint_host = endpoint.replace("https://", "").replace("http://", "")
        self.client = Minio(endpoint_host, access_key=access_key, secret_key=secret_key, secure=secure)
        self.bucket = os.getenv("MINIO_BUCKET", "medical-docs")
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        found = self.client.bucket_exists(self.bucket)
        if not found:
            self.client.make_bucket(self.bucket)

    def upload(self, object_name: str, data: BinaryIO, length: int, content_type: str | None = None) -> str:
        self.client.put_object(self.bucket, object_name, data, length, content_type=content_type)
        return object_name

    def download(self, object_name: str) -> BinaryIO:
        return self.client.get_object(self.bucket, object_name)


@lru_cache(maxsize=1)
def get_storage() -> MinioStorage:
    return MinioStorage()
