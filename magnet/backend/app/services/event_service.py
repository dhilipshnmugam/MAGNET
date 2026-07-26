from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.event import Event, RSVP
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, RSVPCreate
from app.services import point_engine
from app.services import notification_service


async def create_event(db: AsyncSession, creator: User, data: EventCreate) -> Event:
    event = Event(
        creator_id=creator.id,
        title=data.title,
        description=data.description,
        event_date=data.event_date,
        end_date=data.end_date,
        venue=data.venue,
        event_type=data.event_type,
        banner_url=data.banner_url,
    )
    db.add(event)
    await db.flush()

    await point_engine.on_event_created(db, creator.id, event.id)
    await notification_service.notify_event_created(db, creator, event.id, event.title)

    return event


async def list_events(
    db: AsyncSession, user: User, event_type: str = None,
    page: int = 1, page_size: int = 20
) -> tuple[list[Event], int]:
    query = select(Event).options(selectinload(Event.creator))

    if event_type:
        query = query.where(Event.event_type == event_type)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Event.event_date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    events = list(result.scalars().unique().all())

    rsvp_result = await db.execute(
        select(RSVP.event_id, RSVP.status).where(RSVP.user_id == user.id)
    )
    rsvp_map = {row[0]: row[1] for row in rsvp_result.all()}

    for event in events:
        event.user_rsvp_status = rsvp_map.get(event.id)

    return events, total


async def get_event_by_id(db: AsyncSession, event_id: UUID, user: User = None) -> Event:
    result = await db.execute(
        select(Event).options(selectinload(Event.creator)).where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if user:
        rsvp_result = await db.execute(
            select(RSVP.status).where(RSVP.event_id == event_id, RSVP.user_id == user.id)
        )
        rsvp = rsvp_result.scalar_one_or_none()
        event.user_rsvp_status = rsvp

    return event


async def update_event(db: AsyncSession, event_id: UUID, user: User, data: EventUpdate) -> Event:
    event = await get_event_by_id(db, event_id)

    if event.creator_id != user.id and user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    await db.flush()
    return event


async def delete_event(db: AsyncSession, event_id: UUID, user: User) -> bool:
    event = await get_event_by_id(db, event_id)

    if event.creator_id != user.id and user.role != "super_admin":
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
