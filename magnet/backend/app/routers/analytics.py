from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, require_department_admin, require_super_admin, require_principal
from app.models.user import User
from app.schemas.common import ResponseModel
from app.services import analytics_engine

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ──────────────────────────────────────────────
#  Shared: All authenticated users
# ──────────────────────────────────────────────

@router.get("/student-growth", response_model=ResponseModel)
async def get_student_growth(
    months: int = Query(12, ge=1, le=36),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await analytics_engine.student_growth(db, months)
    return ResponseModel(data=data)


@router.get("/activity-graph", response_model=ResponseModel)
async def get_activity_graph(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await analytics_engine.activity_graph(db, days)
    return ResponseModel(data=data)


@router.get("/event-participation", response_model=ResponseModel)
async def get_event_participation(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await analytics_engine.event_participation(db, months)
    return ResponseModel(data=data)


@router.get("/monthly-statistics", response_model=ResponseModel)
async def get_monthly_statistics(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await analytics_engine.monthly_statistics(db)
    return ResponseModel(data=data)


# ──────────────────────────────────────────────
#  HOD endpoints
# ──────────────────────────────────────────────

@router.get("/department-performance", response_model=ResponseModel)
async def get_department_performance(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_department_admin),
):
    data = await analytics_engine.department_performance(db)
    return ResponseModel(data=data)


@router.get("/club-performance", response_model=ResponseModel)
async def get_club_performance(
    department_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_department_admin),
):
    data = await analytics_engine.club_performance(db, department_id)
    return ResponseModel(data=data)


@router.get("/hod-dashboard", response_model=ResponseModel)
async def get_hod_dashboard(
    department_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_department_admin),
):
    data = await analytics_engine.hod_dashboard(db, department_id)
    return ResponseModel(data=data)


@router.get("/hod-self-dashboard", response_model=ResponseModel)
async def get_hod_self_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_department_admin),
):
    data = await analytics_engine.hod_self_dashboard(db, user.id)
    return ResponseModel(data=data)


# ──────────────────────────────────────────────
#  Principal / Admin endpoints
# ──────────────────────────────────────────────

@router.get("/principal-dashboard", response_model=ResponseModel)
async def get_principal_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_principal),
):
    data = await analytics_engine.principal_dashboard(db)
    return ResponseModel(data=data)


@router.get("/principal-departments", response_model=ResponseModel)
async def get_principal_departments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_principal),
):
    data = await analytics_engine.department_performance(db)
    return ResponseModel(data=data)


@router.get("/principal-clubs", response_model=ResponseModel)
async def get_principal_clubs(
    department_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_principal),
):
    data = await analytics_engine.club_performance(db, department_id)
    return ResponseModel(data=data)
