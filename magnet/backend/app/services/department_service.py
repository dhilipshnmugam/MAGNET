from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.department import Department
from app.models.user import User, Hod
from app.models.club import Club
from app.models.post import Post
from app.models.event import Event
from app.models.points import Point
from app.utils.datetime_utils import utc_isoformat


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


def _serialize_member(user: User, points: int = 0) -> dict:
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "email": user.email,
        "role": user.role,
        "year": user.year,
        "register_number": user.register_number,
        "department_id": str(user.department_id) if user.department_id else None,
        "department_name": user.department_name,
        "points": points,
        "created_at": utc_isoformat(user.created_at),
    }


def _serialize_club(club: Club) -> dict:
    return {
        "id": str(club.id),
        "name": club.name,
        "club_code": club.club_code,
        "description": club.description,
        "category": club.category,
        "icon_url": club.icon_url,
        "banner_url": club.banner_url,
        "member_count": len(club.members) if club.members else 0,
        "status": club.status,
        "created_at": utc_isoformat(club.created_at),
    }


def _serialize_post(post: Post) -> dict:
    return {
        "id": str(post.id),
        "author_id": str(post.author_id),
        "content": post.content,
        "title": post.title,
        "post_type": post.post_type,
        "image_url": post.image_url,
        "video_url": post.video_url,
        "visibility": post.visibility,
        "like_count": post.like_count,
        "comment_count": post.comment_count,
        "created_at": utc_isoformat(post.created_at),
        "author": {
            "id": str(post.author.id),
            "full_name": post.author.full_name,
            "avatar_url": post.author.avatar_url,
            "role": post.author.role,
            "department_id": str(post.author.department_id) if post.author.department_id else None,
            "department_name": post.author.department_name,
        } if post.author else None,
        "media": [
            {
                "id": str(media.id),
                "media_url": media.media_url,
                "media_type": media.media_type,
                "thumbnail_url": media.thumbnail_url,
                "sort_order": media.sort_order,
            }
            for media in post.media
        ],
    }


def _serialize_event(event: Event) -> dict:
    return {
        "id": str(event.id),
        "title": event.title,
        "description": event.description,
        "event_date": utc_isoformat(event.event_date),
        "end_date": utc_isoformat(event.end_date),
        "banner_url": event.banner_url,
        "organizer_name": event.organizer_name or (event.club.name if event.club else None),
        "creator_name": event.creator.full_name if event.creator else None,
        "department_name": event.department.name if event.department else None,
        "club_name": event.club.name if event.club else None,
        "contact_email": event.contact_email,
        "contact_phone": event.contact_phone,
        "created_at": utc_isoformat(event.created_at),
    }


async def _get_total_points(db: AsyncSession, dept_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(Point.points_value), 0))
        .select_from(Point)
        .join(User, User.id == Point.user_id)
        .where(User.department_id == dept_id)
    )
    return result.scalar() or 0


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
            selectinload(Department.clubs).selectinload(Club.members),
            selectinload(Department.users),
            selectinload(Department.channels),
        ).where(Department.id == dept_id)
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    college_name_result = await db.execute(
        select(User.college_name)
        .where(User.department_id == dept_id, User.college_name.is_not(None))
        .order_by(User.created_at.asc())
        .limit(1)
    )
    college_name = college_name_result.scalar_one_or_none()

    students = [u for u in dept.users if u.role == "student"]
    faculty = [u for u in dept.users if u.role == "department_admin"]
    club_count = len(dept.clubs)
    total_points = await _get_total_points(db, dept_id)

    points_result = await db.execute(
        select(User.id, func.coalesce(func.sum(Point.points_value), 0))
        .select_from(User)
        .outerjoin(Point, Point.user_id == User.id)
        .where(User.department_id == dept_id)
        .group_by(User.id)
    )
    points_map = {str(user_id): points for user_id, points in points_result.all()}

    posts_result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.author).selectinload(User.department),
            selectinload(Post.media),
        )
        .where(Post.is_approved == True, Post.author.has(department_id=dept_id))
        .order_by(Post.is_pinned.desc(), Post.created_at.desc())
        .limit(12)
    )
    posts = list(posts_result.scalars().unique().all())

    events_result = await db.execute(
        select(Event)
        .options(
            selectinload(Event.creator).selectinload(User.department),
            selectinload(Event.club),
            selectinload(Event.department),
        )
        .where(Event.department_id == dept_id)
        .order_by(Event.event_date.desc())
        .limit(12)
    )
    events = list(events_result.scalars().unique().all())

    data = _build_dept_out(dept, len(students), club_count)
    data["college_name"] = college_name
    data["total_members"] = len(students) + len(faculty)
    data["total_students"] = len(students)
    data["total_faculty"] = len(faculty)
    data["total_posts"] = len(posts)
    data["total_events"] = len(events)
    data["total_clubs"] = club_count
    data["total_points"] = total_points
    data["students"] = [_serialize_member(user, points_map.get(str(user.id), 0)) for user in students]
    data["faculty"] = [_serialize_member(user, points_map.get(str(user.id), 0)) for user in faculty]
    data["clubs"] = [_serialize_club(club) for club in dept.clubs]
    data["posts"] = [_serialize_post(post) for post in posts]
    data["events"] = [_serialize_event(event) for event in events]
    data["achievements"] = [_serialize_post(post) for post in posts if post.post_type == "achievement"]
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


async def get_department_users(
    db: AsyncSession,
    dept_id: UUID,
    role: str = None,
    search: str = None,
    active: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[User], int]:
    query = select(User).where(
        User.department_id == dept_id,
        User.is_active == True,
    )

    if role and role != "all":
        query = query.where(User.role == role)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(pattern),
                User.register_number.ilike(pattern),
                User.email.ilike(pattern),
            )
        )
    if active:
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(days=30)
        query = query.where(User.last_seen_at >= cutoff)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = list(result.scalars().all())

    return users, total
