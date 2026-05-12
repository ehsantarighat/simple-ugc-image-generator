"""FastAPI application entry point."""
from __future__ import annotations

import base64
import logging
import os
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .file_utils import (
    UploadValidationError,
    cleanup_paths,
    save_upload_to_temp,
)
from .image_service import ImageGenerationError, ImageService
from .prompt_builder import build_prompt
from .schemas import (
    AspectRatio,
    GenerationMetadata,
    GenerationResponse,
    HealthResponse,
    Quality,
    UgcTier,
)


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


app = FastAPI(
    title="Influencer UGC Generator",
    version="0.1.0",
    description=(
        "Generate hyperrealistic creator-style UGC product images from a "
        "model reference, a product reference, and a scene description."
    ),
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error": message},
    )


def _parse_enum(value: str, enum_cls, *, field: str):
    try:
        return enum_cls(value)
    except ValueError:
        allowed = ", ".join(e.value for e in enum_cls)
        raise UploadValidationError(
            f"Invalid {field} '{value}'. Allowed values: {allowed}."
        )


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse()


@app.post(
    "/api/generate",
    response_model=GenerationResponse,
    responses={400: {"description": "Validation error"}, 502: {"description": "Upstream error"}},
    tags=["generation"],
)
async def generate(
    model_image: UploadFile = File(..., description="Model reference image."),
    product_image: UploadFile = File(..., description="Product reference image."),
    scene: str = Form(..., description="Short scene description."),
    aspect_ratio: str = Form(AspectRatio.PORTRAIT_4_5.value),
    ugc_tier: str = Form(UgcTier.POLISHED.value),
    quality: str = Form(Quality.HIGH.value),
    usage: str = Form("Instagram post"),
):
    """Generate a UGC product image from the two uploaded references."""
    if not scene or not scene.strip():
        return _error(400, "scene is required.")

    try:
        aspect_enum = _parse_enum(aspect_ratio, AspectRatio, field="aspect_ratio")
        tier_enum = _parse_enum(ugc_tier, UgcTier, field="ugc_tier")
        quality_enum = _parse_enum(quality, Quality, field="quality")
    except UploadValidationError as exc:
        return _error(400, str(exc))

    try:
        model_path = await save_upload_to_temp(
            model_image, field="model_image", max_bytes=settings.max_upload_bytes
        )
    except UploadValidationError as exc:
        return _error(400, str(exc))
    except Exception:
        logger.exception("Failed to read model_image upload")
        return _error(400, "Could not read model_image upload.")

    try:
        product_path = await save_upload_to_temp(
            product_image, field="product_image", max_bytes=settings.max_upload_bytes
        )
    except UploadValidationError as exc:
        cleanup_paths(model_path).__enter__()
        return _error(400, str(exc))
    except Exception:
        cleanup_paths(model_path).__enter__()
        logger.exception("Failed to read product_image upload")
        return _error(400, "Could not read product_image upload.")

    with cleanup_paths(model_path, product_path):
        prompt = build_prompt(
            scene=scene,
            aspect_ratio=aspect_enum,
            ugc_tier=tier_enum,
            quality=quality_enum,
            usage=usage,
        )

        try:
            service = ImageService(
                api_key=settings.openai_api_key,
                default_model=settings.default_image_model,
            )
            result = service.generate(
                prompt=prompt,
                model_image_path=model_path,
                product_image_path=product_path,
                aspect_ratio=aspect_enum,
                quality=quality_enum,
                ugc_tier=tier_enum,
            )
        except ImageGenerationError as exc:
            logger.warning("Image generation failed: %s", exc)
            return _error(502, f"Image generation failed: {exc}")
        except Exception:
            logger.exception("Unexpected error during image generation")
            return _error(500, "Unexpected error during image generation.")

    image_b64 = base64.b64encode(result.image_bytes).decode("ascii")

    response = GenerationResponse(
        image_base64=image_b64,
        mime_type=result.mime_type,
        used_prompt=prompt,
        metadata=GenerationMetadata(
            model=result.model,
            aspect_ratio=result.aspect_ratio,
            quality=result.quality,
            ugc_tier=result.ugc_tier,
        ),
    )
    return response


# Serve the built frontend in production. The frontend build is copied into
# backend/app/static during deployment (see Dockerfile / Railway build).
_STATIC_DIR = Path(__file__).resolve().parent / "static"
if _STATIC_DIR.is_dir() and any(_STATIC_DIR.iterdir()):
    app.mount(
        "/",
        StaticFiles(directory=str(_STATIC_DIR), html=True),
        name="static",
    )
