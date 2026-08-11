from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.common import ResponseModel
from app.services import search_service

router = APIRouter(prefix="/search", tags=["Search"])

VALID_FILTERS = {"all", "people", "clubs", "departments", "posts", "projects"}


@router.get("", response_model=ResponseModel)
async def global_search(
    q: str = Query(..., min_length=1),
    filter_type: str = Query("all"),
    limit: int = Query(5, ge=1, le=50),
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if filter_type not in VALID_FILTERS:
        raise HTTPException(422, f"filter_type must be one of: {', '.join(sorted(VALID_FILTERS))}")
    results = await search_service.global_search(db, q, user, filter_type, limit, page)
    return ResponseModel(data=results)


@router.get("/suggestions", response_model=ResponseModel)
async def search_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    suggestions = await search_service.search_suggestions(db, q, limit)
    return ResponseModel(data=suggestions)
