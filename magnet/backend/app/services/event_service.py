from uuid import UUID
from datetime import datetime, time, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.event import Event, RSVP
from app.models.club import Club
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, RSVPCreate
from app.services import point_engine
from app.services import notification_service

ALLOWED_CATEGORIES = {
    "technical", "cultural", "sports", "workshop", "seminar",
    "competition", "fest", "meeting", "guest_lecture", "general",
}


async def _resolve_organizer(db: AsyncSession, creator: User, data: EventCreate) -> dict:
    """Determine organizer metadata based on the creator's role."""
    club_id = None
    department_id = data.department_id

    if creator.role == "club_admin":
        result = await db.execute(
            select(Club).where(
                or_(Club.club_admin_id == creator.id, Club.owner_id == creator.id)
            ).limit(1)
        )
        club = result.scalar_one_or_none()
        if not club:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Club admins must manage at least one club before creating events",
            )
        club_id = club.id
        if data.department_id is None:
            department_id = club.department_id
    else:
        club_id = data.club_id

    if creator.role == "department_admin" and department_id is None:
        department_id = creator.department_id

    if data.club_id is not None and club_id is not None and data.club_id != club_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Club admins can only create events for their own club",
        )

    if club_id is not None:
        club_check = await db.execute(select(Club).where(Club.id == club_id))
        if not club_check.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    return {
        "club_id": club_id,
        "department_id": department_id,
        "creator_role": creator.role,
        "organizer_name": (data.organizer_name or creator.full_name or creator.email),
    }


def _enrich(event: Event):
    if event.creator:
        event.creator_name = event.creator.full_name
    if event.club:
        event.club_name = event.club.name
    if event.department:
        event.department_name = event.department.name
    if not event.organizer_name and event.creator:
        event.organizer_name = event.creator.full_name
    return event


async def create_event(db: AsyncSession, creator: User, data: EventCreate) -> Event:
    if data.category and data.category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Allowed: {', '.join(sorted(ALLOWED_CATEGORIES))}",
        )

    organizer = await _resolve_organizer(db, creator, data)

    event = Event(
        creator_id=creator.id,
        title=data.title,
        description=data.description,
        category=data.category or "general",
        event_date=data.event_date,
        end_date=data.end_date,
        venue=data.venue,
        event_type=data.event_type,
        banner_url=data.banner_url,
        registration_url=data.registration_url,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        additional_info=data.additional_info,
        **organizer,
    )
    db.add(event)
    await db.flush()

    await point_engine.on_event_created(db, creator.id, event.id)
    await notification_service.notify_event_created(db, creator, event.id, event.title)

    return event


async def list_events(
    db: AsyncSession, user: User,
    search: str = None,
    event_type: str = None,
    category: str = None,
    scope: str = None,
    organizer_type: str = None,
    page: int = 1, page_size: int = 20
) -> tuple[list[Event], int]:
    query = select(Event).options(
        selectinload(Event.creator),
        selectinload(Event.club),
        selectinload(Event.department),
    )

    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                Event.title.ilike(like),
                Event.venue.ilike(like),
                Event.organizer_name.ilike(like),
            )
        )
    if event_type:
        query = query.where(Event.event_type == event_type)
    if category:
        query = query.where(Event.category == category)
    if organizer_type == "club":
        query = query.where(Event.club_id.isnot(None))
    elif organizer_type == "department":
        query = query.where(Event.club_id.is_(None), Event.department_id.isnot(None))
    elif organizer_type == "college":
        query = query.where(Event.club_id.is_(None), Event.department_id.is_(None))

    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), time.min)
    tomorrow_start = today_start + timedelta(days=1)
    month_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        next_month_start = datetime(now.year + 1, 1, 1)
    else:
        next_month_start = datetime(now.year, now.month + 1, 1)

    if scope == "today":
        query = query.where(
            Event.event_date >= today_start,
            Event.event_date < tomorrow_start,
        )
    elif scope == "upcoming":
        query = query.where(Event.event_date >= now)
    elif scope == "past":
        query = query.where(Event.event_date < now)
    elif scope == "month":
        query = query.where(
            Event.event_date >= month_start,
            Event.event_date < next_month_start,
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    if scope == "past":
        query = query.order_by(Event.event_date.desc())
    else:
        query = query.order_by(Event.event_date.asc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    events = list(result.scalars().unique().all())

    rsvp_result = await db.execute(
        select(RSVP.event_id, RSVP.status).where(RSVP.user_id == user.id)
    )
    rsvp_map = {row[0]: row[1] for row in rsvp_result.all()}

    for event in events:
        event.user_rsvp_status = rsvp_map.get(event.id)
        _enrich(event)

    return events, total


async def get_event_by_id(db: AsyncSession, event_id: UUID, user: User = None) -> Event:
    result = await db.execute(
        select(Event).options(
            selectinload(Event.creator),
            selectinload(Event.club),
            selectinload(Event.department),
        ).where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    _enrich(event)

    if user:
        rsvp_result = await db.execute(
            select(RSVP.status).where(RSVP.event_id == event_id, RSVP.user_id == user.id)
        )
        rsvp = rsvp_result.scalar_one_or_none()
        event.user_rsvp_status = rsvp

    return event


async def _managed_club_ids(db: AsyncSession, user: User) -> set[UUID]:
    result = await db.execute(
        select(Club.id).where(
            or_(Club.club_admin_id == user.id, Club.owner_id == user.id)
        )
    )
    return {row[0] for row in result.all()}


async def _can_manage(db: AsyncSession, event: Event, user: User) -> bool:
    if user.role == "super_admin":
        return True
    if event.creator_id == user.id:
        return True
    if event.club_id and user.role == "club_admin":
        managed = await _managed_club_ids(db, user)
        return event.club_id in managed
    if event.department_id and user.role == "department_admin":
        return user.department_id == event.department_id
    return False


async def update_event(db: AsyncSession, event_id: UUID, user: User, data: EventUpdate) -> Event:
    event = await get_event_by_id(db, event_id)

    if not await _can_manage(db, event, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    update_data = data.model_dump(exclude_unset=True)

    if "club_id" in update_data and user.role == "club_admin":
        managed = await _managed_club_ids(db, user)
        if update_data["club_id"] is not None and update_data["club_id"] not in managed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this club")
        if not managed:
            update_data["club_id"] = None
        elif update_data["club_id"] is None:
            update_data["club_id"] = next(iter(managed))

    if "category" in update_data and update_data["category"] and update_data["category"] not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Allowed: {', '.join(sorted(ALLOWED_CATEGORIES))}",
        )

    for key, value in update_data.items():
        setattr(event, key, value)
    await db.flush()
    await db.refresh(event)
    return _enrich(event)


async def delete_event(db: AsyncSession, event_id: UUID, user: User) -> bool:
    event = await get_event_by_id(db, event_id)

    if not await _can_manage(db, event, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db.delete(event)
    await db.flush()
    return True


async def rsvp_event(db: AsyncSession, event_id: UUID, user: User, data: RSVPCreate) -> RSVP:
    event = await get_event_by_id(db, event_id)

    result = await db.execute(
        select(RSVP).where(RSVP.event_id == event_id, RSVP.user_id == user.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        old_status = existing.status
        existing.status = data.status
        if old_status != "going" and data.status == "going":
            event.rsvp_count += 1
            await point_engine.on_event_attended(db, user.id, event_id)
        elif old_status == "going" and data.status != "going":
            event.rsvp_count = max(0, event.rsvp_count - 1)
        await db.flush()
        return existing
    else:
        rsvp = RSVP(event_id=event_id, user_id=user.id, status=data.status)
        db.add(rsvp)
        if data.status == "going":
            event.rsvp_count += 1
            await point_engine.on_event_attended(db, user.id, event_id)
        await db.flush()
        return rsvp


async def get_event_rsvps(db: AsyncSession, event_id: UUID) -> list[RSVP]:
    result = await db.execute(
        select(RSVP).options(selectinload(RSVP.user)).where(RSVP.event_id == event_id)
    )
    return list(result.scalars().unique().all())
