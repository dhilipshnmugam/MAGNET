import re
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.post import Post, PostMedia, Like, Bookmark, PostShare, Hashtag, PostHashtag
from app.models.comment import Comment
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate, CommentCreate
from app.services import point_engine
from app.services import notification_service


def extract_hashtags(text: str) -> list[str]:
    return list(set(re.findall(r'#(\w+)', text)))


async def sync_hashtags(db: AsyncSession, post_id: UUID, text: str) -> None:
    tags = extract_hashtags(text)
    for tag in tags[:10]:
        existing = (await db.execute(select(Hashtag).where(Hashtag.tag == tag.lower()))).scalar_one_or_none()
        if not existing:
            existing = Hashtag(tag=tag.lower(), post_count=1)
            db.add(existing)
            await db.flush()
        else:
            existing.post_count += 1
        db.add(PostHashtag(post_id=post_id, hashtag_id=existing.id))
    await db.flush()


async def remove_hashtags(db: AsyncSession, post_id: UUID) -> None:
    existing_tags = (await db.execute(
        select(PostHashtag.hashtag_id).where(PostHashtag.post_id == post_id)
    )).scalars().all()
    for hid in existing_tags:
        ht = (await db.execute(select(Hashtag).where(Hashtag.id == hid))).scalar_one_or_none()
        if ht:
            ht.post_count = max(0, ht.post_count - 1)
    await db.execute(select(PostHashtag).where(PostHashtag.post_id == post_id))
    for ph in (await db.execute(select(PostHashtag).where(PostHashtag.post_id == post_id))).scalars().all():
        await db.delete(ph)
    await db.flush()


async def create_post(db: AsyncSession, author: User, data: PostCreate) -> Post:
    post = Post(
        author_id=author.id,
        content=data.content,
        role=author.role,
        image_url=data.image_url,
        video_url=data.video_url,
        title=data.title,
        post_type=data.post_type,
        channel_id=data.channel_id,
        club_id=data.club_id,
        visibility=data.visibility,
        location=data.location,
        hashtags=data.hashtags,
        mention_ids=data.mention_ids,
        achievement_type=data.achievement_type,
        achievement_score=data.achievement_score,
        certificate_url=data.certificate_url,
        event_name=data.event_name,
        event_date=data.event_date,
        event_end_date=data.event_end_date,
        event_time=data.event_time,
        event_location=data.event_location,
        registration_url=data.registration_url,
        resource_type=data.resource_type,
        file_url=data.file_url,
        file_name=data.file_name,
        file_size=data.file_size,
        collaboration_type=data.collaboration_type,
        required_skills=data.required_skills,
        team_size=data.team_size,
    )
    db.add(post)
    await db.flush()

    await sync_hashtags(db, post.id, data.content)

    try:
        await point_engine.on_post_created(db, author.id, post.id)
    except Exception:
        pass

    try:
        await notification_service.notify_new_post(db, author, post.id)
    except Exception:
        pass

    result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.author).selectinload(User.department),
            selectinload(Post.media),
        )
        .where(Post.id == post.id)
    )
    return result.scalar_one()


async def get_feed(
    db: AsyncSession, user: User, filter_type: str = "all",
    post_type: str = None, page: int = 1, page_size: int = 20
) -> tuple[list[Post], int]:
    query = select(Post).options(
        selectinload(Post.author).selectinload(User.department),
        selectinload(Post.media),
    ).where(Post.is_approved == True)

    if filter_type == "my_posts":
        query = query.where(Post.author_id == user.id)
    elif filter_type == "saved":
        query = query.join(Bookmark, Bookmark.post_id == Post.id).where(Bookmark.user_id == user.id)
    elif filter_type == "trending":
        from datetime import datetime, timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        query = query.where(Post.created_at >= week_ago)
        query = query.order_by(
            (Post.like_count * 2 + Post.comment_count * 3 + Post.share_count * 4 + Post.view_count * 0.1).desc()
        )
    elif filter_type == "department" and user.department_id:
        query = query.where(
            or_(
                Post.visibility == "public",
                and_(Post.visibility == "department", Post.author.has(department_id=user.department_id)),
            )
        )
    else:
        query = query.where(
            or_(
                Post.visibility == "public",
                Post.author_id == user.id,
                and_(Post.visibility == "department", Post.author.has(department_id=user.department_id)),
            )
        )

    if post_type and post_type != "all":
        query = query.where(Post.post_type == post_type)

    if filter_type != "trending":
        query = query.order_by(Post.is_pinned.desc(), Post.created_at.desc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    posts = list(result.scalars().unique().all())

    if posts:
        post_ids = [p.id for p in posts]
        likes_result = await db.execute(
            select(Like.post_id).where(Like.user_id == user.id, Like.post_id.in_(post_ids))
        )
        like_ids = set(likes_result.scalars().all())

        bookmarks_result = await db.execute(
            select(Bookmark.post_id).where(Bookmark.user_id == user.id, Bookmark.post_id.in_(post_ids))
        )
        bookmark_ids = set(bookmarks_result.scalars().all())

        for post in posts:
            post.is_liked_by_user = post.id in like_ids
            post.is_bookmarked_by_user = post.id in bookmark_ids
    else:
        for post in posts:
            post.is_liked_by_user = False
            post.is_bookmarked_by_user = False

    return posts, total


async def get_user_posts(
    db: AsyncSession, user_id: UUID, viewer: User,
    page: int = 1, page_size: int = 20
) -> tuple[list[Post], int]:
    query = select(Post).options(
        selectinload(Post.author).selectinload(User.department),
        selectinload(Post.media),
    ).where(
        Post.author_id == user_id,
        Post.visibility == "public",
        Post.is_approved == True,
    ).order_by(Post.created_at.desc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    posts = list(result.scalars().unique().all())

    if posts:
        post_ids = [p.id for p in posts]
        likes_result = await db.execute(
            select(Like.post_id).where(Like.user_id == viewer.id, Like.post_id.in_(post_ids))
        )
        like_ids = set(likes_result.scalars().all())
        bookmarks_result = await db.execute(
            select(Bookmark.post_id).where(Bookmark.user_id == viewer.id, Bookmark.post_id.in_(post_ids))
        )
        bookmark_ids = set(bookmarks_result.scalars().all())
        for post in posts:
            post.is_liked_by_user = post.id in like_ids
            post.is_bookmarked_by_user = post.id in bookmark_ids
    else:
        for post in posts:
            post.is_liked_by_user = False
            post.is_bookmarked_by_user = False

    return posts, total


async def get_post_by_id(db: AsyncSession, post_id: UUID, user: User = None) -> Post:
    result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.author).selectinload(User.department),
            selectinload(Post.media),
            selectinload(Post.comments).selectinload(Comment.author),
        )
        .where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    post.view_count += 1
    await db.flush()

    if user:
        like_result = await db.execute(
            select(Like.id).where(Like.post_id == post_id, Like.user_id == user.id)
        )
        post.is_liked_by_user = like_result.scalar_one_or_none() is not None

        bookmark_result = await db.execute(
            select(Bookmark.id).where(Bookmark.post_id == post_id, Bookmark.user_id == user.id)
        )
        post.is_bookmarked_by_user = bookmark_result.scalar_one_or_none() is not None

    return post


async def update_post(db: AsyncSession, post_id: UUID, user: User, data: PostUpdate) -> Post:
    post = await get_post_by_id(db, post_id)
    if post.author_id != user.id and user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this post")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)
    await db.flush()
    return post


async def delete_post(db: AsyncSession, post_id: UUID, user: User) -> bool:
    post = await get_post_by_id(db, post_id)
    if post.author_id != user.id and user.role not in ("super_admin", "department_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this post")

    await remove_hashtags(db, post.id)
    await db.delete(post)
    await db.flush()
    return True


async def toggle_like(db: AsyncSession, post_id: UUID, user: User) -> dict:
    post = await get_post_by_id(db, post_id)

    result = await db.execute(
        select(Like).where(Like.post_id == post_id, Like.user_id == user.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        post.like_count = max(0, post.like_count - 1)
        await point_engine.on_post_unliked(db, user.id, post.author_id, post_id)
        await db.flush()
        return {"liked": False, "like_count": post.like_count}
    else:
        like = Like(post_id=post_id, user_id=user.id)
        db.add(like)
        post.like_count += 1
        await point_engine.on_post_liked(db, user.id, post.author_id, post_id)
        await notification_service.notify_like(db, user, post.author_id, post_id)
        await db.flush()
        return {"liked": True, "like_count": post.like_count}


async def toggle_bookmark(db: AsyncSession, post_id: UUID, user: User) -> dict:
    post = await get_post_by_id(db, post_id)

    result = await db.execute(
        select(Bookmark).where(Bookmark.post_id == post_id, Bookmark.user_id == user.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        post.bookmark_count = max(0, post.bookmark_count - 1)
        await db.flush()
        return {"bookmarked": False, "bookmark_count": post.bookmark_count}
    else:
        bookmark = Bookmark(post_id=post_id, user_id=user.id)
        db.add(bookmark)
        post.bookmark_count += 1
        await db.flush()
        return {"bookmarked": True, "bookmark_count": post.bookmark_count}


async def share_post(db: AsyncSession, post_id: UUID, user: User) -> dict:
    post = await get_post_by_id(db, post_id)

    existing = (await db.execute(
        select(PostShare).where(PostShare.post_id == post_id, PostShare.user_id == user.id)
    )).scalar_one_or_none()

    if not existing:
        share = PostShare(post_id=post_id, user_id=user.id)
        db.add(share)
        post.share_count += 1
        await db.flush()

    return {"shared": True, "share_count": post.share_count}


async def add_comment(db: AsyncSession, post_id: UUID, user: User, data: CommentCreate) -> Comment:
    post = await get_post_by_id(db, post_id)

    if data.parent_id:
        parent_result = await db.execute(select(Comment).where(Comment.id == data.parent_id))
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found")

    comment = Comment(
        post_id=post_id,
        author_id=user.id,
        content=data.content,
        parent_id=data.parent_id,
    )
    db.add(comment)
    post.comment_count += 1
    await db.flush()

    await point_engine.on_comment_added(db, user.id, post_id, comment.id)
    await notification_service.notify_comment(db, user, post.author_id, post_id, data.content)

    return comment


async def get_comments(db: AsyncSession, post_id: UUID, page: int = 1, page_size: int = 20) -> tuple[list[Comment], int]:
    query = (
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.post_id == post_id, Comment.parent_id == None, Comment.is_deleted == False)
        .order_by(Comment.created_at.desc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    comments = list(result.scalars().unique().all())

    return comments, total


async def delete_comment(db: AsyncSession, comment_id: UUID, user: User) -> bool:
    result = await db.execute(
        select(Comment).options(selectinload(Comment.post)).where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.author_id != user.id and user.role not in ("super_admin", "department_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    comment.is_deleted = True
    comment.content = "[deleted]"
    comment.post.comment_count = max(0, comment.post.comment_count - 1)
    await db.flush()
    return True


async def add_post_media(db: AsyncSession, post_id: UUID, media_items: list[dict]) -> list[PostMedia]:
    media_list = []
    for i, item in enumerate(media_items):
        media = PostMedia(
            post_id=post_id,
            media_url=item["url"],
            media_type=item.get("media_type", "image"),
            cloudinary_id=item.get("public_id"),
            thumbnail_url=item.get("thumbnail_url"),
            sort_order=i,
        )
        db.add(media)
        media_list.append(media)
    await db.flush()
    return media_list


async def add_post_images(db: AsyncSession, post_id: UUID, image_urls: list[dict]) -> list[PostMedia]:
    return await add_post_media(db, post_id, [
        {"url": img["url"], "media_type": "image", "public_id": img.get("public_id")}
        for img in image_urls
    ])


async def get_trending_hashtags(db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(
        select(Hashtag)
        .where(Hashtag.post_count > 0)
        .order_by(Hashtag.post_count.desc())
        .limit(limit)
    )
    return [{"tag": h.tag, "post_count": h.post_count} for h in result.scalars().all()]


async def get_post_analytics(db: AsyncSession, post_id: UUID, user: User) -> dict:
    post = await get_post_by_id(db, post_id, user)
    if post.author_id != user.id and user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    total_engagement = post.like_count + post.comment_count + post.share_count + post.bookmark_count
    views = max(post.view_count, 1)
    engagement_rate = round((total_engagement / views) * 100, 2)

    return {
        "post_id": post.id,
        "views": post.view_count,
        "likes": post.like_count,
        "comments": post.comment_count,
        "shares": post.share_count,
        "bookmarks": post.bookmark_count,
        "engagement_rate": engagement_rate,
    }


async def get_user_saved_posts(db: AsyncSession, user: User, page: int = 1, page_size: int = 20) -> tuple[list[Post], int]:
    query = (
        select(Post)
        .options(selectinload(Post.author).selectinload(User.department), selectinload(Post.media))
        .join(Bookmark, Bookmark.post_id == Post.id)
        .where(Bookmark.user_id == user.id)
        .order_by(Bookmark.created_at.desc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    posts = list(result.scalars().unique().all())

    post_ids = [p.id for p in posts]
    if post_ids:
        likes_result = await db.execute(
            select(Like.post_id).where(Like.user_id == user.id, Like.post_id.in_(post_ids))
        )
        like_ids = set(likes_result.scalars().all())
        for p in posts:
            p.is_liked_by_user = p.id in like_ids
            p.is_bookmarked_by_user = True

    return posts, total
