from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, require_super_admin, get_current_user
from app.models.user import User
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut, DepartmentDetailOut
from app.schemas.user import UserOut
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
    return ResponseModel(data=DepartmentDetailOut(**data).model_dump())


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
