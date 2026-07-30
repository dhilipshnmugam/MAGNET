from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.user import User, Student, Hod
from app.models.department import Department
from app.models.notification import NotificationPreference
from app.models.points import Leaderboard
from app.schemas.user import UserRegister, UserLogin, UserUpdate, StudentProfileUpdate, HodProfileUpdate
from app.utils.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, create_password_reset_token,
    verify_password_reset_token
)
from app.utils.email import send_verification_email, send_password_reset_email
from app.utils.validators import validate_password_strength


async def register_user(db: AsyncSession, data: UserRegister) -> User:
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    existing_rn = await db.execute(select(User).where(User.register_number == data.register_number))
    if existing_rn.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Register number already registered")

    if data.college_id:
        existing_college = await db.execute(select(Student).where(Student.college_id == data.college_id))
        if existing_college.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="College ID already registered")

    dept = await db.execute(select(Department).where(Department.id == data.department_id, Department.is_active == True))
    if not dept.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid or inactive department selected")

    is_valid, error_msg = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=error_msg)

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role="student",
        department_id=data.department_id,
        year=data.year,
        register_number=data.register_number,
        college_name=data.college_name,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    if data.college_id:
        student = Student(
            user_id=user.id,
            college_id=data.college_id,
            year_of_study=data.year_of_study,
            semester=data.semester,
            section=data.section,
            phone=data.phone,
            admission_year=data.admission_year,
        )
        db.add(student)

    prefs = NotificationPreference(user_id=user.id)
    db.add(prefs)

    leaderboard = Leaderboard(user_id=user.id)
    db.add(leaderboard)

    await db.flush()
    return user


async def login_user(db: AsyncSession, data: UserLogin) -> dict:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    user.last_login_at = datetime.utcnow()
    await db.flush()

    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    token_data = {"sub": str(user.id), "role": user.role}
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


async def get_user_profile(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(
        select(User)
        .options(selectinload(User.student_profile), selectinload(User.hod_profile), selectinload(User.department))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def update_user_profile(db: AsyncSession, user: User, data: UserUpdate) -> User:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    await db.flush()
    return user


async def update_student_profile(db: AsyncSession, user: User, data: StudentProfileUpdate) -> Student:
    if not user.student_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user.student_profile, key, value)
    await db.flush()
    return user.student_profile


async def update_hod_profile(db: AsyncSession, user: User, data: HodProfileUpdate) -> Hod:
    if not user.hod_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HOD profile not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user.hod_profile, key, value)
    await db.flush()
    return user.hod_profile


async def forgot_password(db: AsyncSession, email: str) -> bool:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        return True

    token = create_password_reset_token(user.id)
    send_password_reset_email(user.email, token)
    return True


async def reset_password(db: AsyncSession, token: str, new_password: str) -> bool:
    user_id = verify_password_reset_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=error_msg)

    user.password_hash = hash_password(new_password)
    await db.flush()
    return True


async def create_user_with_role(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str,
    role: str,
    department_id: UUID = None,
    is_verified: bool = True,
) -> User:
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Email already registered: {email}")

    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=role,
        department_id=department_id,
        is_verified=is_verified,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    prefs = NotificationPreference(user_id=user.id)
    db.add(prefs)
    leaderboard = Leaderboard(user_id=user.id)
    db.add(leaderboard)
    await db.flush()

    return user


async def list_users(
    db: AsyncSession, search: str = None, department_id: UUID = None,
    role: str = None, page: int = 1, page_size: int = 20
) -> tuple[list[User], int]:
    query = select(User).where(User.is_active == True)

    if search:
        query = query.where(User.full_name.ilike(f"%{search}%"))
    if department_id:
        query = query.where(User.department_id == department_id)
    if role:
        query = query.where(User.role == role)

    count_query = select(User.id).where(User.is_active == True)
    if search:
        count_query = count_query.where(User.full_name.ilike(f"%{search}%"))
    if department_id:
        count_query = count_query.where(User.department_id == department_id)
    if role:
        count_query = count_query.where(User.role == role)

    from sqlalchemy import func
    total_result = await db.execute(select(func.count()).select_from(count_query.subquery()))
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    return users, total
