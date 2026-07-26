from fastapi import APIRouter, Depends, UploadFile, File
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import ResponseModel
from app.services import upload_service

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("/image", response_model=ResponseModel)
async def upload_image(
    file: UploadFile = File(...),
    folder: str = "magnet",
    user: User = Depends(get_current_user),
):
    result = await upload_service.upload_file(file, folder)
    return ResponseModel(data=result, message="Image uploaded")
