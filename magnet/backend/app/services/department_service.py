from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.department import Department
from app.models.user import User, Hod
from app.models.club import Club


async def generate_dept_code(db: AsyncSession) -> str:
    result = await db.execute(
        select(Department.code).order_by(Department.code.desc()).limit(1)
    )
    last_code = result.scalar_one_or_none()
    if last_code:
        try:
            last_num = int(last_code.replace("DEPT", ""))
            next_num = last_num + 1
        except ValueError:
            next_num = 1
    else:
        next_num = 1
    return f"DEPT{next_num:03d}"


async def _get_student_count(db: AsyncSession, dept_id: UUID) -> int:
    return (await db.execute(
        select(func.count()).select_from(User).where(
            User.department_id == dept_id, User.role == "student"
        )
    )).scalar() or 0


async def _get_club_count(db: AsyncSession, dept_id: UUID) -> int:
    return (await db.execute(
        select(func.count()).select_from(Club).where(Club.department_id == dept_id)
    )).scalar() or 0


def _build_dept_out(dept: Department, student_count: int = 0, club_count: int = 0) -> dict:
    hod_name = None
    hod_email = None
    if dept.head:
        hod_name = dept.head.full_name
        hod_email = dept.head.email

    return {
        "id": dept.id,
        "name": dept.name,
        "code": dept.code,
        "department_type": dept.department_type,
        "description": dept.description,
        "logo_url": dept.logo_url,
        "cover_image_url": dept.cover_image_url,
        "head_id": dept.head_id,
        "is_active": dept.is_active,
        "status": dept.status,
        "created_at": dept.created_at,
        "updated_at": dept.updated_at,
        "student_count": student_count,
        "club_count": club_count,
        "hod_name": hod_name,
        "hod_email": hod_email,
    }


async def list_departments(
    db: AsyncSession,
    search: str = None,
    status_filter: str = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Department], int]:
    query = select(Department).options(
        selectinload(Department.head),
    )

    if search:
        query = query.where(
            Department.name.ilike(f"%{search}%") | Department.code.ilike(f"%{search}%")
        )
    if status_filter:
        query = query.where(Department.status == status_filter)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Department.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    departments = list(result.scalars().unique().all())

    return departments, total


async def get_department_by_id(db: AsyncSession, dept_id: UUID) -> dict:
    result = await db.execute(
        select(Department).options(
            selectinload(Department.head),
            selectinload(Department.clubs),
            selectinload(Department.users),
            selectinload(Department.channels),
        ).where(Department.id == dept_id)
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    student_count = sum(1 for u in dept.users if u.role == "student")
    club_count = len(dept.clubs)

    data = _build_dept_out(dept, student_count, club_count)
    data["clubs"] = [{"id": str(c.id), "name": c.name} for c in dept.clubs]
    data["channels"] = [{"id": str(ch.id), "name": ch.name} for ch in dept.channels]
    return data


async def create_department(db: AsyncSession, data: dict) -> dict:
    existing = await db.execute(
        select(Department).where((Department.name == data["name"]) | (Department.code == data["code"]))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department with this name or code already exists",
        )

    dept = Department(
        name=data["name"],
        code=data["code"],
        department_type=data.get("department_type"),
        description=data.get("description"),
        logo_url=data.get("logo_url"),
        cover_image_url=data.get("cover_image_url"),
        status=data.get("status", "active"),
        is_active=data.get("status", "active") == "active",
    )
    db.add(dept)
    await db.flush()
    await db.refresh(dept)

    from app.services.auth_service import create_user_with_role
    hod_user = await create_user_with_role(
        db,
        email=data["hod_email"],
        password=data["hod_password"],
        full_name=data["hod_full_name"],
        role="department_admin",
        department_id=dept.id,
    )

    dept.head_id = hod_user.id

    hod_profile = Hod(
        user_id=hod_user.id,
        employee_id=data["hod_employee_id"],
        designation=data.get("hod_designation"),
        qualification=data.get("hod_qualification"),
        specialization=data.get("hod_specialization"),
        phone=data.get("hod_phone"),
        office_room=data.get("hod_office_room"),
    )
    db.add(hod_profile)
    await db.flush()

    return _build_dept_out(dept)


async def update_department(db: AsyncSession, dept_id: UUID, data: dict) -> dict:
    result = await db.execute(
        select(Department).options(selectinload(Department.head)).where(Department.id == dept_id)
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if "name" in data and data["name"] is not None:
        dup = await db.execute(
            select(Department).where(Department.name == data["name"], Department.id != dept_id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department name already exists")
    if "code" in data and data["code"] is not None:
        dup = await db.execute(
            select(Department).where(Department.code == data["code"], Department.id != dept_id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department code already exists")

    for key, value in data.items():
        if value is not None:
            setattr(dept, key, value)

    if "status" in data:
        dept.is_active = data["status"] == "active"

    await db.flush()
    await db.refresh(dept)
    student_count = await _get_student_count(db, dept_id)
    club_count = await _get_club_count(db, dept_id)
    return _build_dept_out(dept, student_count, club_count)


async def toggle_department_status(db: AsyncSession, dept_id: UUID) -> dict:
    result = await db.execute(
        select(Department).options(selectinload(Department.head)).where(Department.id == dept_id)
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    dept.is_active = not dept.is_active
    dept.status = "active" if dept.is_active else "inactive"

    await db.flush()
    await db.refresh(dept)
    student_count = await _get_student_count(db, dept_id)
    club_count = await _get_club_count(db, dept_id)
    return _build_dept_out(dept, student_count, club_count)


async def delete_department(db: AsyncSession, dept_id: UUID) -> None:
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    await db.delete(dept)
    await db.flush()


async def get_department_stats(db: AsyncSession) -> dict:
    total = (await db.execute(select(func.count()).select_from(Department))).scalar() or 0
    active = (await db.execute(
        select(func.count()).select_from(Department).where(Department.is_active == True)
    )).scalar() or 0
    inactive = (await db.execute(
        select(func.count()).select_from(Department).where(Department.is_active == False)
    )).scalar() or 0
    total_students = (await db.execute(
        select(func.count()).select_from(User).where(User.role == "student")
    )).scalar() or 0
    total_clubs = (await db.execute(select(func.count()).select_from(Club))).scalar() or 0

    return {
        "total_departments": total,
        "active_departments": active,
        "inactive_departments": inactive,
        "total_students": total_students,
        "total_clubs": total_clubs,
    }


async def get_department_students(
    db: AsyncSession, dept_id: UUID, page: int = 1, page_size: int = 20
) -> tuple[list[User], int]:
    query = select(User).where(
        User.department_id == dept_id,
        User.role == "student",
        User.is_active == True,
    ).order_by(User.created_at.desc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    students = list(result.scalars().all())

    return students, total
