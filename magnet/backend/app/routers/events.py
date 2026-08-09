from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, require_staff
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, EventOut, RSVPCreate, RSVOUt
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import event_service

router = APIRouter(prefix="/events", tags=["Events"])


@router.post("", response_model=ResponseModel, status_code=201)
@router.post("/", response_model=ResponseModel, status_code=201)
async def create_event(data: EventCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_staff)):
    event = await event_service.create_event(db, user, data)
    return ResponseModel(data=EventOut.model_validate(event).model_dump(), message="Event created")


@router.get("", response_model=PaginatedResponse)
@router.get("/", response_model=PaginatedResponse)
async def list_events(
    search: str = Query(None),
    event_type: str = Query(None),
    category: str = Query(None),
    scope: str = Query(None),
    organizer_type: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    events, total = await event_service.list_events(
        db, user, search, event_type, category, scope, organizer_type, page, page_size
    )
    return PaginatedResponse(
        data=[EventOut.model_validate(e).model_dump() for e in events],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{event_id}", response_model=ResponseModel)
async def get_event(event_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    event = await event_service.get_event_by_id(db, event_id, user)
    return ResponseModel(data=EventOut.model_validate(event).model_dump())


@router.put("/{event_id}", response_model=ResponseModel)
async def update_event(
    event_id: UUID, data: EventUpdate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    event = await event_service.update_event(db, event_id, user, data)
    return ResponseModel(data=EventOut.model_validate(event).model_dump(), message="Event updated")


@router.delete("/{event_id}", response_model=ResponseModel)
async def delete_event(event_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await event_service.delete_event(db, event_id, user)
    return ResponseModel(message="Event deleted")


@router.post("/{event_id}/rsvp", response_model=ResponseModel)
async def rsvp_event(
    event_id: UUID, data: RSVPCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    rsvp = await event_service.rsvp_event(db, event_id, user, data)
    return ResponseModel(data=RSVOUt.model_validate(rsvp).model_dump(), message="RSVP updated")


@router.get("/{event_id}/rsvps", response_model=ResponseModel)
async def get_rsvps(event_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    rsvps = await event_service.get_event_rsvps(db, event_id)
    return ResponseModel(data=[RSVOUt.model_validate(r).model_dump() for r in rsvps])
