from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.dependencies import get_db, require_super_admin, get_current_user
from app.models.user import User
from app.models.department import Department
from app.models.post import Post, Like, Bookmark
from app.models.points import Point
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.schemas.user import UserOut
from app.schemas.post import PostOut
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import department_service

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("/stats/overview", response_model=ResponseModel)
async def department_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    stats = await department_service.get_department_stats(db)
    return ResponseModel(data=stats)


@router.get("", response_model=PaginatedResponse)
@router.get("/", response_model=PaginatedResponse)
async def list_departments(
    search: str = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    departments, total = await department_service.list_departments(
        db, search, status, page, page_size
    )
    return PaginatedResponse(
        data=[
            DepartmentOut.model_validate(
                department_service._build_dept_out(d)
            ).model_dump()
            for d in departments
        ],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{dept_id}", response_model=ResponseModel)
async def get_department(
    dept_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    data = await department_service.get_department_by_id(db, dept_id)
    return ResponseModel(data=data)


@router.post("", response_model=ResponseModel)
@router.post("/", response_model=ResponseModel)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    dept = await department_service.create_department(db, data.model_dump())
    return ResponseModel(
        data=DepartmentOut.model_validate(dept).model_dump(),
        message="Department and admin account created successfully",
    )


@router.put("/{dept_id}", response_model=ResponseModel)
async def update_department(
    dept_id: UUID,
    data: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    dept = await department_service.update_department(db, dept_id, data.model_dump(exclude_unset=True))
    return ResponseModel(
        data=DepartmentOut.model_validate(dept).model_dump(),
        message="Department updated successfully",
    )


@router.put("/{dept_id}/status", response_model=ResponseModel)
async def toggle_department_status(
    dept_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    dept = await department_service.toggle_department_status(db, dept_id)
    return ResponseModel(
        data=DepartmentOut.model_validate(dept).model_dump(),
        message="Department status toggled successfully",
    )


@router.delete("/{dept_id}", response_model=ResponseModel)
async def delete_department(
    dept_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    await department_service.delete_department(db, dept_id)
    return ResponseModel(message="Department deleted successfully")


@router.get("/{dept_id}/students", response_model=PaginatedResponse)
async def get_department_students(
    dept_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dept = await db.execute(select(Department).where(Department.id == dept_id))
    if not dept.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Department not found")

    if current_user.role not in ("super_admin", "department_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == "department_admin" and current_user.department_id != dept_id:
        raise HTTPException(status_code=403, detail="You can only view your own department students")

    students, total = await department_service.get_department_students(db, dept_id, page, page_size)
    return PaginatedResponse(
        data=[UserOut.model_validate(s).model_dump() for s in students],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{dept_id}/users", response_model=PaginatedResponse)
async def get_department_users(
    dept_id: UUID,
    role: str = Query(None),
    search: str = Query(None),
    active: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dept = await db.execute(select(Department).where(Department.id == dept_id))
    if not dept.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Department not found")

    if current_user.role not in ("super_admin", "department_admin", "principal"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == "department_admin" and current_user.department_id != dept_id:
        raise HTTPException(status_code=403, detail="You can only view your own department members")

    users, total = await department_service.get_department_users(
        db, dept_id, role, search, active, page, page_size
    )

    points_map = {}
    if users:
        user_ids = [u.id for u in users]
        points_result = await db.execute(
            select(Point.user_id, func.coalesce(func.sum(Point.points_value), 0))
            .where(Point.user_id.in_(user_ids))
            .group_by(Point.user_id)
        )
        points_map = {str(uid): pts for uid, pts in points_result.all()}

    data = [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
            "email": u.email,
            "role": u.role,
            "year": u.year,
            "register_number": u.register_number,
            "department_id": str(u.department_id) if u.department_id else None,
            "points": points_map.get(str(u.id), 0),
            "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]
    return PaginatedResponse(
        data=data,
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/{dept_id}/posts", response_model=PaginatedResponse)
async def get_department_posts(
    dept_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dept = await db.execute(select(Department).where(Department.id == dept_id))
    if not dept.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Department not found")

    if current_user.role not in ("super_admin", "department_admin", "principal"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == "department_admin" and current_user.department_id != dept_id:
        raise HTTPException(status_code=403, detail="You can only view your own department posts")

    query = (
        select(Post)
        .options(
            selectinload(Post.author).selectinload(User.department),
            selectinload(Post.media),
        )
        .where(
            Post.is_approved == True,
            Post.author.has(department_id=dept_id),
        )
        .order_by(Post.is_pinned.desc(), Post.created_at.desc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    posts = list(result.scalars().unique().all())

    if posts:
        post_ids = [p.id for p in posts]
        likes_result = await db.execute(
            select(Like.post_id).where(Like.user_id == current_user.id, Like.post_id.in_(post_ids))
        )
        like_ids = set(likes_result.scalars().all())
        bookmarks_result = await db.execute(
            select(Bookmark.post_id).where(Bookmark.user_id == current_user.id, Bookmark.post_id.in_(post_ids))
        )
        bookmark_ids = set(bookmarks_result.scalars().all())
        for post in posts:
            post.is_liked_by_user = post.id in like_ids
            post.is_bookmarked_by_user = post.id in bookmark_ids
    else:
        for post in posts:
            post.is_liked_by_user = False
            post.is_bookmarked_by_user = False

    return PaginatedResponse(
        data=[PostOut.model_validate(p).model_dump() for p in posts],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )
