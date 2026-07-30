from typing import Optional
import asyncio
from app.config import settings

try:
    import cloudinary
    import cloudinary.uploader
    _cloudinary_available = True
except ImportError:
    _cloudinary_available = False


def configure_cloudinary():
    if not _cloudinary_available:
        raise RuntimeError("cloudinary package is not installed")
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def _sync_upload(file_bytes: bytes, **upload_params) -> dict:
    """Synchronous cloudinary upload, intended to be called via asyncio.to_thread."""
    return cloudinary.uploader.upload(file_bytes, **upload_params)


async def upload_image(
    file_bytes: bytes,
    folder: str = "magnet",
    public_id: Optional[str] = None,
    transformation: Optional[dict] = None,
) -> dict:
    configure_cloudinary()

    upload_params = {
        "folder": folder,
        "resource_type": "image",
        "format": "webp",
        "quality": "auto",
    }

    if public_id:
        upload_params["public_id"] = public_id
        upload_params["overwrite"] = True

    if transformation:
        upload_params["transformation"] = transformation

    result = await asyncio.to_thread(_sync_upload, file_bytes, **upload_params)

    return {
        "url": result.get("secure_url", ""),
        "public_id": result.get("public_id", ""),
        "width": result.get("width", 0),
        "height": result.get("height", 0),
        "format": result.get("format", ""),
    }


async def upload_video(
    file_bytes: bytes,
    folder: str = "magnet",
    public_id: Optional[str] = None,
) -> dict:
    configure_cloudinary()

    upload_params = {
        "folder": folder,
        "resource_type": "video",
    }

    if public_id:
        upload_params["public_id"] = public_id
        upload_params["overwrite"] = True

    result = await asyncio.to_thread(_sync_upload, file_bytes, **upload_params)

    return {
        "url": result.get("secure_url", ""),
        "public_id": result.get("public_id", ""),
        "width": result.get("width", 0),
        "height": result.get("height", 0),
        "format": result.get("format", ""),
    }


def _sync_destroy(public_id: str) -> dict:
    """Synchronous cloudinary destroy, intended to be called via asyncio.to_thread."""
    return cloudinary.uploader.destroy(public_id)


async def delete_image(public_id: str) -> bool:
    configure_cloudinary()
    try:
        result = await asyncio.to_thread(_sync_destroy, public_id)
        return result.get("result") == "ok"
    except Exception:
        return False
