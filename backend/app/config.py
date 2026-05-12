"""Application configuration loaded from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    """Runtime configuration for the backend."""

    openai_api_key: str
    app_env: str
    max_upload_mb: int
    default_image_model: str
    cors_origins: tuple[str, ...]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


def _parse_origins(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return ("*",)
    items = [item.strip() for item in raw.split(",") if item.strip()]
    return tuple(items) if items else ("*",)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Build and cache a Settings instance from the process environment."""
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
        app_env=os.getenv("APP_ENV", "development").strip() or "development",
        max_upload_mb=int(os.getenv("MAX_UPLOAD_MB", "20")),
        default_image_model=os.getenv("DEFAULT_IMAGE_MODEL", "gpt-image-2").strip()
        or "gpt-image-2",
        cors_origins=_parse_origins(os.getenv("CORS_ORIGINS")),
    )
