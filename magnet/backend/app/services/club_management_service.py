from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy import inspect as sa_inspect
from fastapi import HTTPException, status
from app.models.club import Club, ClubMember, ClubJoinRequest
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
        try:
            last_num = int(last_code.replace("CLB", ""))
            next_num = last_num + 1
        except ValueError:
            next_num = 1
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


async def _get_pending_join_count(db: AsyncSession, club_id: UUID) -> int:
    return (await db.execute(
        select(func.count()).select_from(ClubJoinRequest).where(
            and_(ClubJoinRequest.club_id == club_id, ClubJoinRequest.status == "pending")
        )
    )).scalar() or 0


def _is_loaded(obj, attr):
    try:
        state = sa_inspect(obj)
        return attr in state.dict
    except Exception:
        return False


def _build_club_out(club: Club, member_count: int = 0) -> dict:
    fc = club.faculty_coordinator if _is_loaded(club, 'faculty_coordinator') and club.faculty_coordinator else None
    ca = club.club_admin if _is_loaded(club, 'club_admin') and club.club_admin else None
    dept = club.department if _is_loaded(club, 'department') and club.department else None
    return {
        "id": club.id,
        "name": club.name,
        "club_code": club.club_code,
        "description": club.description,
        "category": club.category,
        "domain": club.domain,
        "club_type": club.club_type,
        "icon_url": club.icon_url,
        "banner_url": club.banner_url,
        "owner_id": club.owner_id,
        "department_id": club.department_id,
        "faculty_coordinator_id": club.faculty_coordinator_id,
        "club_admin_id": club.club_admin_id,
        "created_by": club.created_by,
        "official_email": club.official_email,
        "official_phone": club.official_phone,
        "website": club.website,
        "instagram": club.instagram,
        "linkedin": club.linkedin,
        "approval_mode": club.approval_mode,
        "is_active": club.is_active,
        "status": club.status,
        "member_count": member_count,
        "created_at": club.created_at,
        "faculty_coordinator_name": fc.full_name if fc else None,
        "club_admin_name": ca.full_name if ca else None,
        "department_name": dept.name if dept else None,
    }


async def create_club(db: AsyncSession, data: dict, creator: User) -> Club:
    existing = await db.execute(select(Club).where(Club.name == data["name"]))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Club name already exists")

    club_code = await generate_club_code(db)

    club = Club(
        name=data["name"],
        club_code=club_code,
        description=data.get("description"),
        category=data.get("category"),
        domain=data.get("domain"),
        club_type=data.get("club_type", "technical"),
        department_id=data.get("department_id"),
        faculty_coordinator_id=data.get("faculty_coordinator_id"),
        official_email=data.get("official_email"),
        official_phone=data.get("official_phone"),
        website=data.get("website"),
        instagram=data.get("instagram"),
        linkedin=data.get("linkedin"),
        icon_url=data.get("icon_url"),
        banner_url=data.get("banner_url"),
        approval_mode=data.get("approval_mode", "manual"),
        status=data.get("status", "active"),
        is_active=data.get("status", "active") == "active",
        owner_id=creator.id,
        created_by=creator.id,
    )
    db.add(club)
    await db.flush()

    from app.services.auth_service import create_user_with_role
    admin_user = await create_user_with_role(
        db,
        email=data["admin_email"],
        password=data["admin_password"],
        full_name=data["admin_full_name"],
        role="club_admin",
        department_id=data.get("department_id"),
    )

    club.club_admin_id = admin_user.id

    member = ClubMember(club_id=club.id, user_id=admin_user.id, role="owner")
    db.add(member)

    await db.flush()
    await db.refresh(club)
    return club


async def list_clubs(
    db: AsyncSession,
    search: str = None,
    category: str = None,
    domain: str = None,
    club_type: str = None,
    department_id: UUID = None,
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
    if category:
        query = query.where(Club.category == category)
    if domain:
        query = query.where(Club.domain == domain)
    if club_type:
        query = query.where(Club.club_type == club_type)
    if department_id:
        query = query.where(Club.department_id == department_id)
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
            selectinload(Club.owner),
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

    if "name" in data and data["name"] is not None:
        dup = await db.execute(
            select(Club).where(Club.name == data["name"], Club.id != club_id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Club name already exists")

    for key, value in data.items():
        if value is not None:
            setattr(club, key, value)

    if "status" in data:
        club.is_active = data["status"] == "active"

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

    existing_member = await db.execute(
        select(ClubMember).where(
            and_(ClubMember.club_id == club_id, ClubMember.user_id == user_id)
        )
    )
    if not existing_member.scalar_one_or_none():
        db.add(ClubMember(club_id=club_id, user_id=user_id, role="admin"))

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
    total_pending = (await db.execute(
        select(func.count()).select_from(ClubJoinRequest).where(ClubJoinRequest.status == "pending")
    )).scalar() or 0

    return {
        "total_clubs": total,
        "active_clubs": active,
        "inactive_clubs": inactive,
        "total_members": total_members,
        "total_pending_requests": total_pending,
    }


async def join_club(db: AsyncSession, club_id: UUID, user: User, message: str = None) -> ClubJoinRequest:
    club_result = await db.execute(select(Club).where(Club.id == club_id))
    club = club_result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    if not club.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Club is not active")

    existing_member = await db.execute(
        select(ClubMember).where(
            and_(ClubMember.club_id == club_id, ClubMember.user_id == user.id)
        )
    )
    if existing_member.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member of this club")

    existing_request = await db.execute(
        select(ClubJoinRequest).where(
            and_(
                ClubJoinRequest.club_id == club_id,
                ClubJoinRequest.user_id == user.id,
                ClubJoinRequest.status == "pending",
            )
        )
    )
    if existing_request.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Join request already pending")

    # Auto-approval mode
    if club.approval_mode == "auto":
        member = ClubMember(club_id=club_id, user_id=user.id, role="member")
        db.add(member)
        await db.flush()
        # Create a pre-approved join request for record keeping
        req = ClubJoinRequest(
            club_id=club_id,
            user_id=user.id,
            message=message,
            status="approved",
            reviewed_by=club.club_admin_id,
            reviewed_at=datetime.utcnow(),
        )
        db.add(req)
        await db.flush()
        await db.refresh(req)

        # Notify student
        from app.services.notification_service import create_notification
        await create_notification(
            db,
            user_id=user.id,
            notif_type="approval",
            sender_id=user.id,
            title="Club Membership Approved",
            body=f"You have been automatically added to {club.name}.",
            ref_type="club_join_request",
            ref_id=req.id,
        )
        return req

    # Manual approval mode
    req = ClubJoinRequest(
        club_id=club_id,
        user_id=user.id,
        message=message,
        status="pending",
    )
    db.add(req)
    await db.flush()
    await db.refresh(req)

    # Notify club admin
    if club.club_admin_id:
        from app.services.notification_service import create_notification
        await create_notification(
            db,
            user_id=club.club_admin_id,
            notif_type="approval",
            sender_id=user.id,
            title="New Club Join Request",
            body=f"{user.full_name} has requested to join {club.name}.",
            ref_type="club_join_request",
            ref_id=req.id,
        )

    return req


async def get_club_join_requests(
    db: AsyncSession, club_id: UUID, request_status: str = None, page: int = 1, page_size: int = 20
) -> tuple[list, int]:
    query = select(ClubJoinRequest).options(
        selectinload(ClubJoinRequest.user),
        selectinload(ClubJoinRequest.reviewer),
    ).where(ClubJoinRequest.club_id == club_id)

    if request_status:
        query = query.where(ClubJoinRequest.status == request_status)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(ClubJoinRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    requests = list(result.scalars().unique().all())

    return requests, total


async def review_join_request(
    db: AsyncSession, request_id: UUID, new_status: str, reviewer: User
) -> ClubJoinRequest:
    result = await db.execute(
        select(ClubJoinRequest).where(ClubJoinRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Join request not found")

    if req.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already reviewed")

    req.status = new_status
    req.reviewed_by = reviewer.id
    req.reviewed_at = datetime.utcnow()

    if new_status == "approved":
        existing_member = await db.execute(
            select(ClubMember).where(
                and_(ClubMember.club_id == req.club_id, ClubMember.user_id == req.user_id)
            )
        )
        if not existing_member.scalar_one_or_none():
            db.add(ClubMember(club_id=req.club_id, user_id=req.user_id, role="member"))

    await db.flush()
    await db.refresh(req)

    # Notify student
    from app.services.notification_service import create_notification
    club_result = await db.execute(select(Club).where(Club.id == req.club_id))
    club = club_result.scalar_one_or_none()
    club_name = club.name if club else "the club"

    if new_status == "approved":
        notif_type = "approval"
        notif_body = f"Your request to join {club_name} has been approved."
    else:
        notif_type = "rejected"
        notif_body = f"Your request to join {club_name} has been rejected."

    await create_notification(
        db,
        user_id=req.user_id,
        notif_type=notif_type,
        sender_id=reviewer.id,
        title=f"Club Request {new_status.title()}",
        body=notif_body,
        ref_type="club_join_request",
        ref_id=req.id,
    )

    return req


async def get_club_members(
    db: AsyncSession, club_id: UUID, page: int = 1, page_size: int = 50
) -> tuple[list, int]:
    query = select(ClubMember).options(
        selectinload(ClubMember.user),
    ).where(ClubMember.club_id == club_id)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(ClubMember.joined_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    members = list(result.scalars().unique().all())

    return members, total


async def remove_club_member(db: AsyncSession, club_id: UUID, user_id: UUID) -> None:
    result = await db.execute(
        select(ClubMember).where(
            and_(ClubMember.club_id == club_id, ClubMember.user_id == user_id)
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the club owner")

    await db.delete(member)
    await db.flush()


async def leave_club(db: AsyncSession, club_id: UUID, user: User) -> None:
    result = await db.execute(
        select(ClubMember).where(
            and_(ClubMember.club_id == club_id, ClubMember.user_id == user.id)
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a member of this club")

    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Club owner cannot leave. Transfer ownership first.")

    await db.delete(member)
    await db.flush()


async def get_user_club_membership(db: AsyncSession, club_id: UUID, user_id: UUID) -> ClubMember | None:
    result = await db.execute(
        select(ClubMember).where(
            and_(ClubMember.club_id == club_id, ClubMember.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()


async def get_club_dashboard(db: AsyncSession, club_id: UUID) -> dict:
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
    pending_requests = await _get_pending_join_count(db, club_id)

    recent_members_result = await db.execute(
        select(ClubMember).options(
            selectinload(ClubMember.user),
        ).where(ClubMember.club_id == club_id)
        .order_by(ClubMember.joined_at.desc()).limit(5)
    )
    recent_members = [
        {
            "user_id": m.user_id,
            "user_name": m.user.full_name if m.user else None,
            "user_avatar": m.user.avatar_url if m.user else None,
            "role": m.role,
            "joined_at": m.joined_at,
        }
        for m in recent_members_result.scalars().all()
    ]

    return {
        "club": _build_club_out(club, member_count),
        "member_count": member_count,
        "post_count": post_count,
        "pending_requests": pending_requests,
        "recent_members": recent_members,
    }


async def get_hod_department_id(db: AsyncSession, user_id: UUID) -> UUID | None:
    result = await db.execute(select(User.department_id).where(User.id == user_id))
    return result.scalar_one_or_none()
