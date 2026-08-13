from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.club import Club, ClubMember
from app.models.department import Department
from app.models.post import Post, Like, Bookmark
from app.models.project import Project
from app.schemas.post import PostOut
from app.utils.datetime_utils import utc_isoformat


def _build_user_result(u: User) -> dict:
    return {
        "id": str(u.id),
        "full_name": u.full_name,
        "avatar_url": u.avatar_url,
        "role": u.role,
        "department_id": str(u.department_id) if u.department_id else None,
        "department_name": u.department_name,
        "bio": u.bio,
        "year": u.year,
        "register_number": u.register_number,
        "email": u.email,
        "entity_type": "user",
    }


def _build_club_result(c: Club) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "club_code": c.club_code,
        "description": c.description,
        "category": c.category,
        "domain": c.domain,
        "icon_url": c.icon_url,
        "member_count": 0,
        "department_id": str(c.department_id) if c.department_id else None,
        "entity_type": "club",
    }


def _build_department_result(d: Department, student_count: int = 0) -> dict:
    hod_name = d.head.full_name if d.head else None
    hod_email = d.head.email if d.head else None
    return {
        "id": str(d.id),
        "name": d.name,
        "code": d.code,
        "department_type": d.department_type,
        "description": d.description,
        "hod_name": hod_name,
        "hod_email": hod_email,
        "student_count": student_count,
        "entity_type": "department",
    }


def _build_project_result(p: Project) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "description": (p.description[:200] + ("..." if len(p.description) > 200 else "")) if p.description else None,
        "tech_stack": p.tech_stack,
        "category": p.category,
        "status": p.status,
        "owner": (
            {"id": str(p.owner.id), "full_name": p.owner.full_name, "avatar_url": p.owner.avatar_url}
            if p.owner else None
        ),
        "member_count": len(p.members),
        "created_at": utc_isoformat(p.created_at),
        "entity_type": "project",
    }


async def _load_full_posts(db: AsyncSession, posts: list[Post], user: User) -> list[dict]:
    """Attach liked/bookmarked flags and serialize posts with the full PostOut shape."""
    if posts:
        post_ids = [p.id for p in posts]
        like_ids = set((await db.execute(
            select(Like.post_id).where(Like.user_id == user.id, Like.post_id.in_(post_ids))
        )).scalars().all())
        bookmark_ids = set((await db.execute(
            select(Bookmark.post_id).where(Bookmark.user_id == user.id, Bookmark.post_id.in_(post_ids))
        )).scalars().all())
        for p in posts:
            p.is_liked_by_user = p.id in like_ids
            p.is_bookmarked_by_user = p.id in bookmark_ids
    return [PostOut.model_validate(p).model_dump() for p in posts]


async def global_search(
    db: AsyncSession,
    q: str,
    user: User,
    filter_type: str = "all",
    limit: int = 5,
    page: int = 1,
) -> dict:
    offset = (page - 1) * limit
    pattern = f"%{q}%"
    results = {}

    if filter_type in ("all", "people"):
        users_query = (
            select(User)
            .options(selectinload(User.department))
            .where(
                User.is_active == True,
                or_(
                    User.full_name.ilike(pattern),
                    User.email.ilike(pattern),
                    User.bio.ilike(pattern),
                    User.register_number.ilike(pattern),
                    User.college_name.ilike(pattern),
                ),
            )
            .order_by(
                User.full_name.ilike(q).desc(),    # exact prefix match first
                User.full_name.ilike(f"{q}%").desc(),  # prefix match next
                User.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        users = [_build_user_result(u) for u in (await db.execute(users_query)).scalars().all()]
        users_total = await db.execute(
            select(func.count()).select_from(
                select(User).where(
                    User.is_active == True,
                    or_(
                        User.full_name.ilike(pattern),
                        User.email.ilike(pattern),
                        User.bio.ilike(pattern),
                        User.register_number.ilike(pattern),
                        User.college_name.ilike(pattern),
                    ),
                ).subquery()
            )
        )
        results["users"] = {
            "data": users,
            "total": users_total.scalar() or 0,
        }

    if filter_type in ("all", "clubs"):
        clubs_query = (
            select(Club)
            .options(selectinload(Club.members))
            .where(
                Club.is_active == True,
                or_(
                    Club.name.ilike(pattern),
                    Club.description.ilike(pattern),
                    Club.category.ilike(pattern),
                    Club.domain.ilike(pattern),
                    Club.club_code.ilike(pattern),
                ),
            )
            .order_by(
                Club.name.ilike(q).desc(),
                Club.name.ilike(f"{q}%").desc(),
                Club.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        clubs = [_build_club_result(c) for c in (await db.execute(clubs_query)).scalars().all()]
        clubs_total = await db.execute(
            select(func.count()).select_from(
                select(Club).where(
                    Club.is_active == True,
                    or_(
                        Club.name.ilike(pattern),
                        Club.description.ilike(pattern),
                        Club.category.ilike(pattern),
                        Club.domain.ilike(pattern),
                        Club.club_code.ilike(pattern),
                    ),
                ).subquery()
            )
        )
        results["clubs"] = {
            "data": clubs,
            "total": clubs_total.scalar() or 0,
        }

    if filter_type in ("all", "departments"):
        depts_query = (
            select(Department)
            .options(selectinload(Department.head))
            .where(
                Department.is_active == True,
                or_(
                    Department.name.ilike(pattern),
                    Department.code.ilike(pattern),
                    Department.description.ilike(pattern),
                ),
            )
            .order_by(
                Department.name.ilike(q).desc(),
                Department.name.ilike(f"{q}%").desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        depts = await db.execute(depts_query)
        dept_results = []
        for d in depts.scalars().all():
            student_count = (
                await db.execute(
                    select(func.count()).select_from(User).where(
                        User.department_id == d.id, User.role == "student"
                    )
                )
            ).scalar() or 0
            dept_results.append(_build_department_result(d, student_count))
        depts_total = await db.execute(
            select(func.count()).select_from(
                select(Department).where(
                    Department.is_active == True,
                    or_(
                        Department.name.ilike(pattern),
                        Department.code.ilike(pattern),
                        Department.description.ilike(pattern),
                    ),
                ).subquery()
            )
        )
        results["departments"] = {
            "data": dept_results,
            "total": depts_total.scalar() or 0,
        }

    if filter_type in ("all", "posts"):
        posts_query = (
            select(Post)
            .options(
                selectinload(Post.author).selectinload(User.department),
                selectinload(Post.media),
            )
            .where(
                Post.is_approved == True,
                or_(
                    Post.content.ilike(pattern),
                    Post.title.ilike(pattern),
                    Post.hashtags.ilike(pattern),
                    Post.author.has(User.full_name.ilike(pattern)),
                ),
            )
            .order_by(Post.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        raw_posts = list((await db.execute(posts_query)).scalars().unique().all())
        posts = await _load_full_posts(db, raw_posts, user)
        posts_total = await db.execute(
            select(func.count()).select_from(
                select(Post).where(
                    Post.is_approved == True,
                    or_(
                        Post.content.ilike(pattern),
                        Post.title.ilike(pattern),
                        Post.hashtags.ilike(pattern),
                        Post.author.has(User.full_name.ilike(pattern)),
                    ),
                ).subquery()
            )
        )
        results["posts"] = {
            "data": posts,
            "total": posts_total.scalar() or 0,
        }

    if filter_type in ("all", "projects"):
        projects_query = (
            select(Project)
            .options(
                selectinload(Project.owner),
                selectinload(Project.members),
            )
            .where(
                or_(
                    Project.name.ilike(pattern),
                    Project.description.ilike(pattern),
                    Project.category.ilike(pattern),
                ),
            )
            .order_by(
                Project.name.ilike(q).desc(),
                Project.name.ilike(f"{q}%").desc(),
                Project.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        projects = [_build_project_result(p) for p in (await db.execute(projects_query)).scalars().unique().all()]
        projects_total = await db.execute(
            select(func.count()).select_from(
                select(Project).where(
                    or_(
                        Project.name.ilike(pattern),
                        Project.description.ilike(pattern),
                        Project.category.ilike(pattern),
                    ),
                ).subquery()
            )
        )
        results["projects"] = {
            "data": projects,
            "total": projects_total.scalar() or 0,
        }

    return results


async def search_suggestions(
    db: AsyncSession,
    q: str,
    limit: int = 5,
) -> list[dict]:
    if not q or len(q.strip()) < 2:
        return []

    pattern = f"%{q}%"
    prefix_pattern = f"{q}%"
    suggestions = []

    users = await db.execute(
        select(User)
        .where(
            User.is_active == True,
            or_(
                User.full_name.ilike(prefix_pattern),
                User.full_name.ilike(pattern),
            ),
        )
        .order_by(
            User.full_name.ilike(q).desc(),
            User.full_name.ilike(prefix_pattern).desc(),
        )
        .limit(limit)
    )
    for u in users.scalars().all():
        suggestions.append({
            "id": str(u.id),
            "text": u.full_name,
            "subtext": u.role.replace("_", " ").title(),
            "avatar_url": u.avatar_url,
            "entity_type": "user",
            "entity_id": str(u.id),
        })

    clubs = await db.execute(
        select(Club)
        .where(
            Club.is_active == True,
            Club.name.ilike(prefix_pattern),
        )
        .limit(limit)
    )
    for c in clubs.scalars().all():
        suggestions.append({
            "id": str(c.id),
            "text": c.name,
            "subtext": c.category or "Club",
            "avatar_url": c.icon_url,
            "entity_type": "club",
            "entity_id": str(c.id),
        })

    return suggestions[:limit]
