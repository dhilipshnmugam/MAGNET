from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.club import Club, ClubMember
from app.models.post import Post
from app.models.event import Event
from app.models.user import User
from app.models.department import Department


async def generate_club_code(db: AsyncSession) -> str:
    result = await db.execute(
        select(Club.club_code).order_by(Club.club_code.desc()).limit(1)
    )
    last_code = result.scalar_one_or_none()

    if last_code:
        last_num = int(last_code.replace("CLB", ""))
        next_num = last_num + 1
    else:
        next_num = 1

    return f"CLB{next_num:03d}"


async def _get_member_count(db: AsyncSession, club_id: UUID) -> int:
    return (await db.execute(
        select(func.count()).select_from(ClubMember).where(ClubMember.club_id == club_id)
    )).scalar() or 0


async def _get_post_count(db: AsyncSession, club_id: UUID) -> int:
    return (await db.execute(
        select(func.count()).select_from(Post).where(Post.club_id == club_id)
    )).scalar() or 0


async def _get_event_count(db: AsyncSession, club_admin_id: UUID) -> int:
    return (await db.execute(
        select(func.count()).select_from(Event).where(Event.creator_id == club_admin_id)
    )).scalar() or 0


def _build_club_out(club: Club, member_count: int = 0) -> dict:
    return {
        "id": club.id,
        "name": club.name,
        "club_code": club.club_code,
        "domain": club.domain,
        "description": club.description,
        "logo_url": club.icon_url,
        "banner_url": club.banner_url,
        "owner_id": club.owner_id,
        "department_id": club.department_id,
        "faculty_coordinator_id": club.faculty_coordinator_id,
        "club_admin_id": club.club_admin_id,
        "email": club.email,
        "phone": club.phone,
        "is_active": club.is_active,
        "status": club.status,
        "member_count": member_count,
        "created_at": club.created_at,
        "faculty_coordinator_name": club.faculty_coordinator.full_name if club.faculty_coordinator else None,
        "club_admin_name": club.club_admin.full_name if club.club_admin else None,
        "department_name": club.department.name if club.department else None,
    }


async def create_club(db: AsyncSession, data: dict, creator: User) -> Club:
    club_code = await generate_club_code(db)

    club = Club(
        name=data["name"],
        club_code=club_code,
        domain=data.get("domain"),
        description=data.get("description"),
        department_id=data.get("department_id"),
        faculty_coordinator_id=data.get("faculty_coordinator_id"),
        club_admin_id=data.get("club_admin_id"),
        email=data.get("email"),
        phone=data.get("phone"),
        icon_url=data.get("logo_url"),
        banner_url=data.get("banner_url"),
        status=data.get("status", "active"),
        owner_id=creator.id,
    )
    db.add(club)
    await db.flush()
    await db.refresh(club)
    return club


async def list_clubs(
    db: AsyncSession,
    search: str = None,
    domain: str = None,
    status_filter: str = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Club], int]:
    query = select(Club).options(
        selectinload(Club.faculty_coordinator),
        selectinload(Club.club_admin),
        selectinload(Club.department),
    )

    if search:
        query = query.where(
            Club.name.ilike(f"%{search}%") | Club.club_code.ilike(f"%{search}%")
        )
    if domain:
        query = query.where(Club.domain == domain)
    if status_filter:
        query = query.where(Club.status == status_filter)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Club.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    clubs = list(result.scalars().unique().all())

    return clubs, total


async def get_club_by_id(db: AsyncSession, club_id: UUID) -> dict:
    result = await db.execute(
        select(Club).options(
            selectinload(Club.faculty_coordinator),
            selectinload(Club.club_admin),
            selectinload(Club.department),
        ).where(Club.id == club_id)
    )
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    member_count = await _get_member_count(db, club_id)
    post_count = await _get_post_count(db, club_id)
    event_count = 0
    if club.club_admin_id:
        event_count = await _get_event_count(db, club.club_admin_id)

    data = _build_club_out(club, member_count)
    data["post_count"] = post_count
    data["event_count"] = event_count
    return data


async def update_club(db: AsyncSession, club_id: UUID, data: dict) -> Club:
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    for key, value in data.items():
        if value is not None:
            if key == "logo_url":
                club.icon_url = value
            else:
                setattr(club, key, value)

    await db.flush()
    await db.refresh(club)
    return club


async def toggle_club_status(db: AsyncSession, club_id: UUID) -> Club:
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    club.is_active = not club.is_active
    club.status = "active" if club.is_active else "inactive"

    await db.flush()
    await db.refresh(club)
    return club


async def delete_club(db: AsyncSession, club_id: UUID) -> None:
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    await db.delete(club)
    await db.flush()


async def assign_club_admin(db: AsyncSession, club_id: UUID, user_id: UUID) -> Club:
    club_result = await db.execute(select(Club).where(Club.id == club_id))
    club = club_result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    club.club_admin_id = user_id
    user.role = "club_admin"

    await db.flush()
    await db.refresh(club)
    return club


async def remove_club_admin(db: AsyncSession, club_id: UUID) -> Club:
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    if club.club_admin_id:
        admin_result = await db.execute(select(User).where(User.id == club.club_admin_id))
        admin_user = admin_result.scalar_one_or_none()
        if admin_user:
            other_clubs = (await db.execute(
                select(func.count()).select_from(Club).where(
                    and_(Club.club_admin_id == admin_user.id, Club.id != club_id)
                )
            )).scalar() or 0
            if other_clubs == 0:
                admin_user.role = "student"

    club.club_admin_id = None

    await db.flush()
    await db.refresh(club)
    return club


async def get_club_stats(db: AsyncSession) -> dict:
    total = (await db.execute(select(func.count()).select_from(Club))).scalar() or 0
    active = (await db.execute(
        select(func.count()).select_from(Club).where(Club.is_active == True)
    )).scalar() or 0
    inactive = (await db.execute(
        select(func.count()).select_from(Club).where(Club.is_active == False)
    )).scalar() or 0
    total_members = (await db.execute(
        select(func.count()).select_from(ClubMember)
    )).scalar() or 0

    return {
        "total_clubs": total,
        "active_clubs": active,
        "inactive_clubs": inactive,
        "total_members": total_members,
    }
