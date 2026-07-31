import os
import uuid
from fastapi import UploadFile, HTTPException, status
from app.config import settings
from app.utils.validators import validate_media_type, validate_file_size


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")

MAX_FILE_MB = int(settings.MAX_UPLOAD_MB or 50)

_ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg", "audio/x-wav",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip", "application/x-zip-compressed",
    "text/plain", "text/csv",
}


def _get_extension(filename: str, content_type: str) -> str:
    if filename and "." in filename:
        return os.path.splitext(filename)[1][:12]
    mapping = {
        "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif",
        "image/webp": ".webp", "image/svg+xml": ".svg",
        "video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm",
        "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/ogg": ".ogg",
        "application/pdf": ".pdf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/zip": ".zip",
        "text/plain": ".txt",
        "text/csv": ".csv",
    }
    return mapping.get(content_type, ".bin")


def _get_media_type(content_type: str) -> str:
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    if content_type.startswith("audio/"):
        return "audio"
    if content_type == "application/pdf":
        return "pdf"
    return "document"


def _get_file_type(content_type: str) -> str:
    if content_type.startswith("image/gif"):
        return "gif"
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    if content_type.startswith("audio/"):
        return "audio"
    if content_type == "application/pdf":
        return "pdf"
    return "file"


async def _get_cloudinary():
    from app.utils.cloudinary import upload_image, upload_video, delete_image
    return upload_image, upload_video, delete_image


def _is_cloudinary_configured() -> bool:
    return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)


async def _save_local(file_bytes: bytes, folder: str, content_type: str, original_name: str = "") -> dict:
    target_dir = os.path.join(UPLOAD_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)

    ext = _get_extension(original_name, content_type)
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
        "file_type": _get_file_type(content_type),
    }


async def upload_file(file: UploadFile, folder: str = "magnet") -> dict:
    if not file.content_type or file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid file type. Allowed: images, videos, audio, PDF, Word, Excel, PowerPoint, ZIP, CSV, TXT"
        )

    contents = await file.read()

    if file.content_type.startswith("video/"):
        max_mb = max(MAX_FILE_MB, 100)
    elif file.content_type.startswith("image/"):
        max_mb = 10
    else:
        max_mb = MAX_FILE_MB

    if not validate_file_size(len(contents), max_mb=max_mb):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File too large. Maximum size is {max_mb}MB"
        )

    if _is_cloudinary_configured():
        is_video = file.content_type.startswith("video/")
        upload_image, upload_video, _ = await _get_cloudinary()
        try:
            if is_video:
                result = await upload_video(contents, folder=folder)
            else:
                result = await upload_image(contents, folder=folder)
            return {
                "url": result["url"],
                "public_id": result["public_id"],
                "width": result.get("width", 0),
                "height": result.get("height", 0),
                "media_type": "video" if is_video else _get_media_type(file.content_type),
                "file_type": _get_file_type(file.content_type),
            }
        except Exception:
            # fall back to local storage if cloud upload fails
            pass

    return await _save_local(contents, folder, file.content_type, file.filename or "")


async def upload_message_attachment(file: UploadFile) -> dict:
    """Upload a message attachment, returning metadata usable for a message's attachments list."""
    result = await upload_file(file, folder="messages")
    result["file_name"] = getattr(file, "filename", None) or ""
    result["file_size"] = 0
    return result


async def delete_file(public_id: str) -> bool:
    if _is_cloudinary_configured():
        _, _, delete_image = await _get_cloudinary()
        return await delete_image(public_id)
    return True
