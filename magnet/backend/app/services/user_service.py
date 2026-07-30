from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status
from app.models.user import User, Student, Hod, UserFollow
from app.models.department import Department
from app.models.post import Post


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def get_user_profile(db: AsyncSession, user_id: UUID, viewer_id: UUID = None) -> dict:
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .options(selectinload(User.student_profile), selectinload(User.hod_profile))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    follower_count = (await db.execute(
        select(func.count()).select_from(UserFollow).where(UserFollow.following_id == user_id)
    )).scalar() or 0

    following_count = (await db.execute(
        select(func.count()).select_from(UserFollow).where(UserFollow.follower_id == user_id)
    )).scalar() or 0

    post_count = (await db.execute(
        select(func.count()).select_from(Post).where(Post.author_id == user_id)
    )).scalar() or 0

    is_following = False
    is_self = False
    if viewer_id:
        is_self = viewer_id == user_id
        if not is_self:
            existing = (await db.execute(
                select(UserFollow).where(
                    and_(UserFollow.follower_id == viewer_id, UserFollow.following_id == user_id)
                )
            )).scalar_one_or_none()
            is_following = existing is not None

    return {
        "user": user,
        "follower_count": follower_count,
        "following_count": following_count,
        "post_count": post_count,
        "is_following": is_following,
        "is_self": is_self,
    }


async def follow_user(db: AsyncSession, follower_id: UUID, following_id: UUID) -> None:
    if follower_id == following_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")

    target = await get_user_by_id(db, following_id)

    existing = (await db.execute(
        select(UserFollow).where(
            and_(UserFollow.follower_id == follower_id, UserFollow.following_id == following_id)
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already following this user")

    follow = UserFollow(follower_id=follower_id, following_id=following_id)
    db.add(follow)
    await db.flush()


async def unfollow_user(db: AsyncSession, follower_id: UUID, following_id: UUID) -> None:
    result = await db.execute(
        select(UserFollow).where(
            and_(UserFollow.follower_id == follower_id, UserFollow.following_id == following_id)
        )
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not following this user")
    await db.delete(follow)
    await db.flush()


async def get_followers(db: AsyncSession, user_id: UUID, page: int = 1, page_size: int = 20) -> tuple[list, int]:
    query = (
        select(User)
        .join(UserFollow, UserFollow.follower_id == User.id)
        .where(UserFollow.following_id == user_id)
    )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all(), total


async def get_following(db: AsyncSession, user_id: UUID, page: int = 1, page_size: int = 20) -> tuple[list, int]:
    query = (
        select(User)
        .join(UserFollow, UserFollow.following_id == User.id)
        .where(UserFollow.follower_id == user_id)
    )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all(), total


async def search_users(
    db: AsyncSession, q: str = None, department_id: UUID = None,
    role: str = None, page: int = 1, page_size: int = 20
) -> tuple[list[User], int]:
    query = select(User).where(User.is_active == True)

    if q:
        query = query.where(
            User.full_name.ilike(f"%{q}%") | User.email.ilike(f"%{q}%")
        )
    if department_id:
        query = query.where(User.department_id == department_id)
    if role:
        query = query.where(User.role == role)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(User.full_name).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()
    return users, total


async def change_user_role(db: AsyncSession, user_id: UUID, new_role: str, admin: User) -> User:
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role")

    user = await get_user_by_id(db, user_id)

    if new_role == "department_admin" and not user.hod_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot promote to HOD without HOD profile"
        )

    user.role = new_role
    await db.flush()
    return user


async def toggle_user_status(db: AsyncSession, user_id: UUID, is_active: bool, admin: User) -> User:
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own status")

    user = await get_user_by_id(db, user_id)
    user.is_active = is_active
    await db.flush()
    return user


async def delete_user(db: AsyncSession, user_id: UUID, admin: User) -> bool:
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    user = await get_user_by_id(db, user_id)
    await db.delete(user)
    await db.flush()
    return True


async def get_departments(db: AsyncSession) -> list[Department]:
    result = await db.execute(select(Department).where(Department.is_active == True).order_by(Department.name))
    return result.scalars().all()


async def get_user_stats(db: AsyncSession) -> dict:
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    total_students = (await db.execute(select(func.count()).select_from(User).where(User.role == "student"))).scalar()
    total_faculty = (await db.execute(select(func.count()).select_from(User).where(User.role == "department_admin"))).scalar()
    total_admins = (await db.execute(select(func.count()).select_from(User).where(User.role == "super_admin"))).scalar()
    active_users = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_admins": total_admins,
        "active_users": active_users,
    }
