from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, require_super_admin
from app.models.user import User
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import leaderboard_engine

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


# ──────────────────────────────────────────────
#  TOP: Students / Clubs / Departments
# ──────────────────────────────────────────────

@router.get("/top/students", response_model=ResponseModel)
async def get_top_students(
    limit: int = Query(10, ge=1, le=100),
    department_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.top_students(db, limit, department_id)
    return ResponseModel(data=data)


@router.get("/top/clubs", response_model=ResponseModel)
async def get_top_clubs(
    limit: int = Query(10, ge=1, le=100),
    department_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.top_clubs(db, limit, department_id)
    return ResponseModel(data=data)


@router.get("/top/departments", response_model=ResponseModel)
async def get_top_departments(
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.top_departments(db, limit)
    return ResponseModel(data=data)


# ──────────────────────────────────────────────
#  TIME-BASED: Weekly / Monthly / Yearly
# ──────────────────────────────────────────────

@router.get("/weekly", response_model=ResponseModel)
async def get_weekly_ranking(
    entity_type: str = Query("user", regex="^(user|club|department)$"),
    limit: int = Query(10, ge=1, le=100),
    department_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.weekly_ranking(db, entity_type, limit, department_id)
    return ResponseModel(data=data)


@router.get("/monthly", response_model=ResponseModel)
async def get_monthly_ranking(
    entity_type: str = Query("user", regex="^(user|club|department)$"),
    limit: int = Query(10, ge=1, le=100),
    department_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.monthly_ranking(db, entity_type, limit, department_id)
    return ResponseModel(data=data)


@router.get("/yearly", response_model=ResponseModel)
async def get_yearly_ranking(
    entity_type: str = Query("user", regex="^(user|club|department)$"),
    limit: int = Query(10, ge=1, le=100),
    department_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.yearly_ranking(db, entity_type, limit, department_id)
    return ResponseModel(data=data)


# ──────────────────────────────────────────────
#  OVERALL (all-time)
# ──────────────────────────────────────────────

@router.get("/overall", response_model=ResponseModel)
async def get_overall_ranking(
    entity_type: str = Query("user", regex="^(user|club|department)$"),
    limit: int = Query(10, ge=1, le=100),
    department_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.overall_ranking(db, entity_type, limit, department_id)
    return ResponseModel(data=data)


# ──────────────────────────────────────────────
#  MY RANKING
# ──────────────────────────────────────────────

@router.get("/me", response_model=ResponseModel)
async def get_my_ranking(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.my_ranking(db, user.id)
    return ResponseModel(data=data)


# ──────────────────────────────────────────────
#  POINTS HISTORY
# ──────────────────────────────────────────────

@router.get("/points/history", response_model=PaginatedResponse)
async def get_points_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from sqlalchemy import select, func
    from app.models.points import Point

    count_q = select(func.count()).select_from(Point).where(Point.user_id == user.id)
    total = (await db.execute(count_q)).scalar()

    query = (
        select(Point)
        .where(Point.user_id == user.id)
        .order_by(Point.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    points = result.scalars().all()

    data = [
        {
            "id": str(p.id),
            "activity_type": p.activity_type,
            "points_value": p.points_value,
            "ref_type": p.ref_type,
            "ref_id": str(p.ref_id) if p.ref_id else None,
            "description": p.description,
            "created_at": p.created_at.isoformat(),
        }
        for p in points
    ]

    return PaginatedResponse(
        data=data, total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


# ──────────────────────────────────────────────
#  STATS DASHBOARD
# ──────────────────────────────────────────────

@router.get("/stats", response_model=ResponseModel)
async def get_leaderboard_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await leaderboard_engine.leaderboard_stats(db)
    return ResponseModel(data=data)


# ──────────────────────────────────────────────
#  ADMIN: Snapshots & Recalculation
# ──────────────────────────────────────────────

@router.post("/snapshots/{period_type}", response_model=ResponseModel)
async def compute_snapshots(
    period_type: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    count = await leaderboard_engine.compute_snapshots(db, period_type)
    return ResponseModel(message=f"Computed {count} {period_type} snapshots")


@router.post("/recalculate", response_model=ResponseModel)
async def recalculate_all(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    from app.services import point_engine
    await point_engine.recalculate_leaderboard(db)
    await point_engine.recalculate_club_rankings(db)
    await point_engine.recalculate_department_rankings(db)
    return ResponseModel(message="All rankings recalculated successfully")
