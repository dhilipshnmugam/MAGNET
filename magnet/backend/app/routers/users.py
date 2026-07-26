from uuid import UUID
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, require_super_admin, require_student, require_department_admin
from app.models.user import User
from app.schemas.user import (
    UserOut, UserDetailOut, UserUpdate, StudentProfileUpdate,
    HodProfileUpdate, StudentOut, HodOut, RoleUpdate, AccountStatusUpdate, UserWithProfile
)
from app.schemas.common import ResponseModel, PaginatedResponse
from app.services import auth_service, user_service, upload_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=ResponseModel)
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await auth_service.get_user_profile(db, current_user.id)
    data = UserWithProfile(
        user=UserOut.model_validate(user),
        student=StudentOut.model_validate(user.student_profile) if user.student_profile else None,
        hod=HodOut.model_validate(user.hod_profile) if user.hod_profile else None,
    )
    return ResponseModel(data=data.model_dump())


@router.put("/me", response_model=ResponseModel)
async def update_my_profile(
    data: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    user = await auth_service.update_user_profile(db, current_user, data)
    return ResponseModel(data=UserOut.model_validate(user).model_dump(), message="Profile updated")


@router.put("/me/student", response_model=ResponseModel)
async def update_student_profile(
    data: StudentProfileUpdate,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    student = await auth_service.update_student_profile(db, current_user, data)
    return ResponseModel(message="Student profile updated")


@router.put("/me/hod", response_model=ResponseModel)
async def update_hod_profile(
    data: HodProfileUpdate,
    current_user: User = Depends(require_department_admin),
    db: AsyncSession = Depends(get_db),
):
    hod = await auth_service.update_hod_profile(db, current_user, data)
    return ResponseModel(message="HOD profile updated")


@router.get("/", response_model=PaginatedResponse)
async def list_users(
    search: str = Query(None),
    department_id: UUID = Query(None),
    role: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users, total = await auth_service.list_users(db, search, department_id, role, page, page_size)
    return PaginatedResponse(
        data=[UserOut.model_validate(u).model_dump() for u in users],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.get("/departments", response_model=ResponseModel)
async def list_departments(db: AsyncSession = Depends(get_db)):
    from app.models.department import Department
    from sqlalchemy import select
    result = await db.execute(select(Department).where(Department.is_active == True).order_by(Department.name))
    departments = result.scalars().all()
    from app.schemas.common import ResponseModel as RM
    return RM(data=[{"id": str(d.id), "name": d.name, "code": d.code} for d in departments])


@router.get("/{user_id}", response_model=ResponseModel)
async def get_user(user_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = await user_service.get_user_by_id(db, user_id)
    return ResponseModel(data=UserOut.model_validate(user).model_dump())
