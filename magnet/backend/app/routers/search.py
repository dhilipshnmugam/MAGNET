from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.common import ResponseModel
from app.services import search_service

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/", response_model=ResponseModel)
async def global_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    results = await search_service.global_search(db, q, user, limit)
    return ResponseModel(data=results)
