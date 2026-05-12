"""Helpers for receiving uploaded images as temporary files."""
from __future__ import annotations

import os
import tempfile
from contextlib import contextmanager
from typing import Iterator

from fastapi import UploadFile


ALLOWED_MIME_PREFIXES = ("image/",)
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


class UploadValidationError(Exception):
    """Raised when an uploaded file fails validation."""


def _guess_extension(upload: UploadFile) -> str:
    if upload.filename:
        _, ext = os.path.splitext(upload.filename)
        if ext.lower() in ALLOWED_EXTENSIONS:
            return ext.lower()
    if upload.content_type == "image/png":
        return ".png"
    if upload.content_type in ("image/jpeg", "image/jpg"):
        return ".jpg"
    if upload.content_type == "image/webp":
        return ".webp"
    if upload.content_type == "image/gif":
        return ".gif"
    return ".png"


def validate_upload(upload: UploadFile, *, field: str) -> None:
    """Raise UploadValidationError if the file looks wrong before reading."""
    if upload is None or not getattr(upload, "filename", None):
        raise UploadValidationError(f"{field} is required.")
    content_type = (upload.content_type or "").lower()
    if not any(content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
        raise UploadValidationError(
            f"{field} must be an image (got content type '{content_type or 'unknown'}')."
        )


async def save_upload_to_temp(
    upload: UploadFile,
    *,
    field: str,
    max_bytes: int,
) -> str:
    """Stream an UploadFile to a NamedTemporaryFile and return its path.

    Enforces a hard max-size cap while streaming. Raises
    UploadValidationError if the file exceeds the limit. The caller owns
    the returned path and is responsible for removing it.
    """
    validate_upload(upload, field=field)

    suffix = _guess_extension(upload)
    fd, tmp_path = tempfile.mkstemp(prefix="ugc_", suffix=suffix)
    written = 0
    try:
        with os.fdopen(fd, "wb") as out:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise UploadValidationError(
                        f"{field} exceeds maximum upload size of "
                        f"{max_bytes // (1024 * 1024)} MB."
                    )
                out.write(chunk)
    except Exception:
        _silent_remove(tmp_path)
        raise
    finally:
        await upload.close()

    if written == 0:
        _silent_remove(tmp_path)
        raise UploadValidationError(f"{field} is empty.")

    return tmp_path


def _silent_remove(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass


@contextmanager
def cleanup_paths(*paths: str) -> Iterator[None]:
    """Context manager that deletes the provided paths on exit."""
    try:
        yield
    finally:
        for path in paths:
            if path:
                _silent_remove(path)
