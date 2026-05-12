"""Pydantic schemas and shared enums for the API."""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class AspectRatio(str, Enum):
    SQUARE = "1:1"
    PORTRAIT_4_5 = "4:5"
    PORTRAIT_9_16 = "9:16"
    LANDSCAPE_16_9 = "16:9"


class UgcTier(str, Enum):
    RAW = "raw"
    POLISHED = "polished"
    PREMIUM = "premium"


class Quality(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class GenerationMetadata(BaseModel):
    model: str
    aspect_ratio: AspectRatio
    quality: Quality
    ugc_tier: UgcTier


class GenerationResponse(BaseModel):
    success: Literal[True] = True
    image_base64: str = Field(..., description="Base64-encoded PNG image data.")
    mime_type: str = "image/png"
    used_prompt: str
    metadata: GenerationMetadata


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: str
