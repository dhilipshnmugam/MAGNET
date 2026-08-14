from datetime import datetime, timedelta
from typing import Optional, Union
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.story import Story, StoryLike, StoryComment, StoryView
from app.models.user import User
from app.schemas.story import StoryCreate, StoryCommentCreate, StoryOut, StoryCommentOut
from app.utils.datetime_utils import utc_isoformat

STORY_CREATOR_ROLES = {"principal", "club_admin", "department_admin"}
STORY_LIFETIME_HOURS = 24


def _utcnow() -> datetime:
    return datetime.utcnow()


def _is_expired(story: Story) -> bool:
    expires = story.expires_at
    if expires.tzinfo is not None:
        expires = expires.replace(tzinfo=None)
    return expires <= _utcnow()


def ensure_can_create(user: User) -> None:
    if user.role not in STORY_CREATOR_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal, Club Admin, and Department Admin can create stories",
        )


def story_to_dict(story: Story) -> dict:
    data = StoryOut.model_validate(story).model_dump()
    data["created_at"] = utc_isoformat(story.created_at)
    data["expires_at"] = utc_isoformat(story.expires_at)
    return data


def story_comment_to_dict(comment: StoryComment) -> dict:
    data = StoryCommentOut.model_validate(comment).model_dump()
    data["created_at"] = utc_isoformat(comment.created_at)
    return data


async def _get_active_story(
    db, story_id: UUID, user: Optional[User] = None
) -> Story:
    result = await db.execute(
        select(Story)
        .options(selectinload(Story.creator))
        .where(Story.id == story_id)
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    if _is_expired(story):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Story has expired")

    story.is_liked_by_user = False
    if user:
        like = (
            await db.execute(
                select(StoryLike.id).where(
                    StoryLike.story_id == story_id,
                    StoryLike.user_id == user.id,
                )
            )
        ).scalar_one_or_none()
        story.is_liked_by_user = like is not None
    return story


async def create_story(db, creator: User, data: StoryCreate) -> Story:
    ensure_can_create(creator)
    now = _utcnow()
    story = Story(
        creator_id=creator.id,
        content=data.content,
        media_url=data.media_url,
        media_type=data.media_type,
        thumbnail_url=data.thumbnail_url,
        created_at=now,
        expires_at=now + timedelta(hours=STORY_LIFETIME_HOURS),
    )
    db.add(story)
    await db.flush()

    result = await db.execute(
        select(Story)
        .options(selectinload(Story.creator))
        .where(Story.id == story.id)
    )
    return result.scalar_one()


async def get_active_stories(db, user: User) -> list[Story]:
    result = await db.execute(
        select(Story)
        .options(selectinload(Story.creator))
        .where(Story.expires_at > _utcnow())
        .order_by(Story.created_at.desc())
    )
    stories = list(result.scalars().unique().all())

    if stories:
        story_ids = [s.id for s in stories]
        likes = (
            await db.execute(
                select(StoryLike.story_id).where(
                    StoryLike.user_id == user.id,
                    StoryLike.story_id.in_(story_ids),
                )
            )
        ).scalars().all()
        like_ids = set(likes)
        for s in stories:
            s.is_liked_by_user = s.id in like_ids
    return stories


async def get_story_by_id(db, story_id: UUID, user: User) -> Story:
    return await _get_active_story(db, story_id, user)


async def like_story(db, story_id: UUID, user: User) -> dict:
    story = await _get_active_story(db, story_id, user)
    existing = (
        await db.execute(
            select(StoryLike).where(
                StoryLike.story_id == story_id,
                StoryLike.user_id == user.id,
            )
        )
    ).scalar_one_or_none()

    if not existing:
        db.add(StoryLike(story_id=story_id, user_id=user.id))
        story.like_count += 1
        await db.flush()

    return {"liked": True, "like_count": story.like_count}


async def unlike_story(db, story_id: UUID, user: User) -> dict:
    story = await _get_active_story(db, story_id, user)
    existing = (
        await db.execute(
            select(StoryLike).where(
                StoryLike.story_id == story_id,
                StoryLike.user_id == user.id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        await db.delete(existing)
        story.like_count = max(0, story.like_count - 1)
        await db.flush()

    return {"liked": False, "like_count": story.like_count}


async def add_comment(db, story_id: UUID, user: User, data: StoryCommentCreate) -> StoryComment:
    story = await _get_active_story(db, story_id)
    comment = StoryComment(
        story_id=story_id,
        author_id=user.id,
        content=data.content,
    )
    db.add(comment)
    story.comment_count += 1
    await db.flush()

    result = await db.execute(
        select(StoryComment)
        .options(selectinload(StoryComment.author))
        .where(StoryComment.id == comment.id)
    )
    return result.scalar_one()


async def get_comments(
    db, story_id: UUID, page: int = 1, page_size: int = 20
) -> tuple[list[StoryComment], int]:
    await _get_active_story(db, story_id)

    query = (
        select(StoryComment)
        .options(selectinload(StoryComment.author))
        .where(StoryComment.story_id == story_id)
        .order_by(StoryComment.created_at.desc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    comments = list(result.scalars().unique().all())
    return comments, total


async def delete_story(db, story_id: UUID, user: User) -> bool:
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    if story.creator_id != user.id and user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this story",
        )

    await db.delete(story)
    await db.flush()
    return True


def _ensure_owner(story: Story, user: User) -> None:
    if story.creator_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the story owner can view insights",
        )


async def record_view(db, story_id: UUID, user: User) -> dict:
    """Record a unique view for a story. Idempotent per (story, user).
    The story owner is never counted as a viewer of their own story.
    """
    story = await _get_active_story(db, story_id, user)
    if story.creator_id == user.id:
        return {"viewed": False, "view_count": story.view_count}

    existing = (
        await db.execute(
            select(StoryView.id).where(
                StoryView.story_id == story_id,
                StoryView.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not existing:
        db.add(StoryView(story_id=story_id, user_id=user.id))
        story.view_count += 1
        await db.flush()

    return {"viewed": True, "view_count": story.view_count}


async def get_story_viewers(db, story_id: UUID, user: User) -> dict:
    story = await _get_active_story(db, story_id, user)
    _ensure_owner(story, user)

    rows = (
        await db.execute(
            select(User, StoryView.created_at)
            .join(StoryView, StoryView.user_id == User.id)
            .where(StoryView.story_id == story_id)
            .order_by(StoryView.created_at.desc())
        )
    ).all()

    viewers = [
        {
            "user_id": str(u.id),
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
            "role": u.role,
            "viewed_at": utc_isoformat(vt),
        }
        for u, vt in rows
    ]
    return {"total": len(viewers), "viewers": viewers}


async def get_story_likers(db, story_id: UUID, user: User) -> dict:
    story = await _get_active_story(db, story_id, user)
    _ensure_owner(story, user)

    rows = (
        await db.execute(
            select(User, StoryLike.created_at)
            .join(StoryLike, StoryLike.user_id == User.id)
            .where(StoryLike.story_id == story_id)
            .order_by(StoryLike.created_at.desc())
        )
    ).all()

    likers = [
        {
            "user_id": str(u.id),
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
            "role": u.role,
            "liked_at": utc_isoformat(lt),
        }
        for u, lt in rows
    ]
    return {"total": len(likers), "likers": likers}
