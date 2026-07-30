from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.post import (
    PostCreate, PostUpdate, PostOut, CommentCreate, CommentOut,
    PostAnalyticsOut, TrendingTagOut,
)
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import post_service

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.post("", response_model=ResponseModel, status_code=201)
async def create_post(data: PostCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == "super_admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Super Admin cannot create posts.")
    post = await post_service.create_post(db, user, data)
    post_data = PostOut.model_validate(post).model_dump()
    return ResponseModel(data=post_data, message="Post created")


@router.get("", response_model=PaginatedResponse)
async def get_feed(
    filter_type: str = Query("all"),
    post_type: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    posts, total = await post_service.get_feed(db, user, filter_type, post_type, page, page_size)
    return PaginatedResponse(
        data=[PostOut.model_validate(p).model_dump() for p in posts],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/saved", response_model=PaginatedResponse)
async def get_saved_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    posts, total = await post_service.get_user_saved_posts(db, user, page, page_size)
    return PaginatedResponse(
        data=[PostOut.model_validate(p).model_dump() for p in posts],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/user/{user_id}", response_model=PaginatedResponse)
async def get_user_posts(
    user_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    posts, total = await post_service.get_user_posts(db, user_id, user, page, page_size)
    return PaginatedResponse(
        data=[PostOut.model_validate(p).model_dump() for p in posts],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/trending", response_model=ResponseModel)
async def get_trending_tags(
    limit: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    tags = await post_service.get_trending_hashtags(db, limit)
    return ResponseModel(data=tags)


@router.get("/{post_id}", response_model=ResponseModel)
async def get_post(post_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    post = await post_service.get_post_by_id(db, post_id, user)
    return ResponseModel(data=PostOut.model_validate(post).model_dump())


@router.put("/{post_id}", response_model=ResponseModel)
async def update_post(
    post_id: UUID, data: PostUpdate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    post = await post_service.update_post(db, post_id, user, data)
    return ResponseModel(data=PostOut.model_validate(post).model_dump(), message="Post updated")


@router.delete("/{post_id}", response_model=ResponseModel)
async def delete_post(post_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await post_service.delete_post(db, post_id, user)
    return ResponseModel(message="Post deleted")


@router.post("/{post_id}/like", response_model=ResponseModel)
async def toggle_like(post_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await post_service.toggle_like(db, post_id, user)
    return ResponseModel(data=result)


@router.post("/{post_id}/bookmark", response_model=ResponseModel)
async def toggle_bookmark(post_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await post_service.toggle_bookmark(db, post_id, user)
    return ResponseModel(data=result)


@router.post("/{post_id}/share", response_model=ResponseModel)
async def share_post(post_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await post_service.share_post(db, post_id, user)
    return ResponseModel(data=result)


@router.get("/{post_id}/analytics", response_model=ResponseModel)
async def get_post_analytics(post_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    data = await post_service.get_post_analytics(db, post_id, user)
    return ResponseModel(data=data)


@router.get("/{post_id}/comments", response_model=PaginatedResponse)
async def get_comments(
    post_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    comments, total = await post_service.get_comments(db, post_id, page, page_size)
    return PaginatedResponse(
        data=[CommentOut.model_validate(c).model_dump() for c in comments],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.post("/{post_id}/comments", response_model=ResponseModel, status_code=201)
async def add_comment(
    post_id: UUID, data: CommentCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    comment = await post_service.add_comment(db, post_id, user, data)
    return ResponseModel(data=CommentOut.model_validate(comment).model_dump(), message="Comment added")


@router.delete("/comments/{comment_id}", response_model=ResponseModel)
async def delete_comment(comment_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await post_service.delete_comment(db, comment_id, user)
    return ResponseModel(message="Comment deleted")
