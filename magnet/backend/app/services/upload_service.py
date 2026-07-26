from fastapi import UploadFile, HTTPException, status
from app.utils.cloudinary import upload_image, upload_video, delete_image
from app.utils.validators import validate_media_type, validate_file_size


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

    is_video = file.content_type and file.content_type.startswith("video/")

    if is_video:
        result = await upload_video(contents, folder=folder)
    else:
        result = await upload_image(contents, folder=folder)

    return {
        "url": result["url"],
        "public_id": result["public_id"],
        "width": result.get("width", 0),
        "height": result.get("height", 0),
    }


async def delete_file(public_id: str) -> bool:
    return await delete_image(public_id)
