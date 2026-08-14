from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.story import StoryCreate, StoryCommentCreate
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import story_service

router = APIRouter(prefix="/stories", tags=["Stories"])


@router.post("", response_model=ResponseModel, status_code=201)
async def create_story(
    data: StoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    story = await story_service.create_story(db, user, data)
    return ResponseModel(data=story_service.story_to_dict(story), message="Story created")


@router.get("", response_model=ResponseModel)
async def get_active_stories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stories = await story_service.get_active_stories(db, user)
    return ResponseModel(
        data=[story_service.story_to_dict(s) for s in stories],
        message="Active stories",
    )


@router.get("/{story_id}", response_model=ResponseModel)
async def get_story(
    story_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    story = await story_service.get_story_by_id(db, story_id, user)
    return ResponseModel(data=story_service.story_to_dict(story))


@router.delete("/{story_id}", response_model=ResponseModel)
async def delete_story(
    story_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await story_service.delete_story(db, story_id, user)
    return ResponseModel(message="Story deleted")


@router.post("/{story_id}/like", response_model=ResponseModel)
async def like_story(
    story_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await story_service.like_story(db, story_id, user)
    return ResponseModel(data=result, message="Story liked")


@router.delete("/{story_id}/like", response_model=ResponseModel)
async def unlike_story(
    story_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await story_service.unlike_story(db, story_id, user)
    return ResponseModel(data=result, message="Story unliked")


@router.get("/{story_id}/comments", response_model=PaginatedResponse)
async def get_comments(
    story_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    comments, total = await story_service.get_comments(db, story_id, page, page_size)
    return PaginatedResponse(
        data=[story_service.story_comment_to_dict(c) for c in comments],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.post("/{story_id}/comments", response_model=ResponseModel, status_code=201)
async def add_comment(
    story_id: UUID,
    data: StoryCommentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    comment = await story_service.add_comment(db, story_id, user, data)
    return ResponseModel(
        data=story_service.story_comment_to_dict(comment),
        message="Comment added",
    )


@router.post("/{story_id}/view", response_model=ResponseModel)
async def view_story(
    story_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await story_service.record_view(db, story_id, user)
    return ResponseModel(data=result, message="View recorded")


@router.get("/{story_id}/viewers", response_model=ResponseModel)
async def get_story_viewers(
    story_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await story_service.get_story_viewers(db, story_id, user)
    return ResponseModel(data=data, message="Story viewers")


@router.get("/{story_id}/likes", response_model=ResponseModel)
async def get_story_likers(
    story_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await story_service.get_story_likers(db, story_id, user)
    return ResponseModel(data=data, message="Story likes")
