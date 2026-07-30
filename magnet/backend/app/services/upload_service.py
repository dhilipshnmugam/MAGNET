import os
import uuid
from fastapi import UploadFile, HTTPException, status
from app.config import settings
from app.utils.validators import validate_media_type, validate_file_size


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")


async def _get_cloudinary():
    from app.utils.cloudinary import upload_image, upload_video, delete_image
    return upload_image, upload_video, delete_image


def _is_cloudinary_configured() -> bool:
    return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)


def _get_extension(content_type: str) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/webm": ".webm",
    }
    return mapping.get(content_type, ".bin")


def _get_media_type(content_type: str) -> str:
    return "video" if content_type.startswith("video/") else "image"


async def _save_local(file_bytes: bytes, folder: str, content_type: str) -> dict:
    target_dir = os.path.join(UPLOAD_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)

    ext = _get_extension(content_type)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(target_dir, filename)

    with open(filepath, "wb") as f:
        f.write(file_bytes)

    url = f"http://localhost:8000/uploads/{folder}/{filename}"
    return {
        "url": url,
        "public_id": filename,
        "width": 0,
        "height": 0,
        "media_type": _get_media_type(content_type),
    }


async def upload_file(file: UploadFile, folder: str = "magnet") -> dict:
    if not file.content_type or not validate_media_type(file.content_type):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV, WebM"
        )

    contents = await file.read()

    max_mb = 50 if file.content_type and file.content_type.startswith("video/") else 10
    if not validate_file_size(len(contents), max_mb=max_mb):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File too large. Maximum size is {max_mb}MB"
        )

    if _is_cloudinary_configured():
        is_video = file.content_type and file.content_type.startswith("video/")
        upload_image, upload_video, _ = await _get_cloudinary()
        if is_video:
            result = await upload_video(contents, folder=folder)
        else:
            result = await upload_image(contents, folder=folder)
        return {
            "url": result["url"],
            "public_id": result["public_id"],
            "width": result.get("width", 0),
            "height": result.get("height", 0),
            "media_type": "video" if is_video else "image",
        }

    return await _save_local(contents, folder, file.content_type)


async def delete_file(public_id: str) -> bool:
    if _is_cloudinary_configured():
        _, _, delete_image = await _get_cloudinary()
        return await delete_image(public_id)
    return True
