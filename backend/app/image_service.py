"""GPT Image 2 integration via the OpenAI Python SDK.

The model receives both the model reference image and the product reference
image, plus the structured prompt produced by ``prompt_builder``. The
response is a base64-encoded PNG which we return alongside metadata.
"""
from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from typing import Optional

from openai import OpenAI, OpenAIError

from .schemas import AspectRatio, Quality, UgcTier


logger = logging.getLogger(__name__)


# Aspect ratio → pixel size mapping, per the product spec.
_ASPECT_TO_SIZE: dict[AspectRatio, str] = {
    AspectRatio.SQUARE: "1024x1024",
    AspectRatio.PORTRAIT_4_5: "1024x1280",
    AspectRatio.PORTRAIT_9_16: "1024x1792",
    AspectRatio.LANDSCAPE_16_9: "1536x864",
}


class ImageGenerationError(Exception):
    """Raised when the upstream image API fails."""


@dataclass(frozen=True)
class GeneratedImage:
    image_bytes: bytes
    mime_type: str
    model: str
    aspect_ratio: AspectRatio
    quality: Quality
    ugc_tier: UgcTier


def _size_for(aspect_ratio: AspectRatio) -> str:
    return _ASPECT_TO_SIZE[aspect_ratio]


class ImageService:
    """Thin wrapper around the OpenAI image edit endpoint."""

    def __init__(self, *, api_key: str, default_model: str) -> None:
        if not api_key:
            raise ImageGenerationError(
                "OPENAI_API_KEY is not configured. Set it in the environment."
            )
        self._client = OpenAI(api_key=api_key)
        self._default_model = default_model

    def generate(
        self,
        *,
        prompt: str,
        model_image_path: str,
        product_image_path: str,
        aspect_ratio: AspectRatio,
        quality: Quality,
        ugc_tier: UgcTier,
        model: Optional[str] = None,
    ) -> GeneratedImage:
        """Call the image model with two reference images and a prompt."""
        chosen_model = model or self._default_model
        size = _size_for(aspect_ratio)

        model_fp = open(model_image_path, "rb")
        product_fp = open(product_image_path, "rb")
        try:
            try:
                response = self._client.images.edit(
                    model=chosen_model,
                    image=[model_fp, product_fp],
                    prompt=prompt,
                    size=size,
                    quality=quality.value,
                    n=1,
                )
            except OpenAIError as exc:
                logger.exception("OpenAI image edit failed")
                raise ImageGenerationError(str(exc)) from exc
        finally:
            model_fp.close()
            product_fp.close()

        data = getattr(response, "data", None) or []
        if not data:
            raise ImageGenerationError("Image API returned no data.")
        b64 = getattr(data[0], "b64_json", None)
        if not b64:
            raise ImageGenerationError(
                "Image API response did not include base64 image data."
            )

        try:
            image_bytes = base64.b64decode(b64)
        except (ValueError, TypeError) as exc:
            raise ImageGenerationError("Failed to decode image response.") from exc

        return GeneratedImage(
            image_bytes=image_bytes,
            mime_type="image/png",
            model=chosen_model,
            aspect_ratio=aspect_ratio,
            quality=quality,
            ugc_tier=ugc_tier,
        )
