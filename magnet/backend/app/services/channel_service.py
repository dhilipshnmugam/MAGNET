import re
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.channel import Channel, ChannelMember, ChannelMessage
from app.models.user import User
from app.schemas.channel import ChannelCreate, ChannelUpdate, ChannelMessageCreate


def generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


async def create_channel(db: AsyncSession, owner: User, data: ChannelCreate) -> Channel:
    slug = generate_slug(data.name)
    existing = await db.execute(select(Channel).where(Channel.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Channel with similar name exists")

    channel = Channel(
        name=data.name,
        slug=slug,
        description=data.description,
        type=data.type,
        owner_id=owner.id,
        department_id=data.department_id,
    )
    db.add(channel)
    await db.flush()

    member = ChannelMember(channel_id=channel.id, user_id=owner.id, role="owner")
    db.add(member)
    channel.member_count = 1
    await db.flush()
    return channel


async def list_channels(
    db: AsyncSession, user: User, search: str = None, page: int = 1, page_size: int = 20
) -> tuple[list[Channel], int]:
    query = select(Channel).options(selectinload(Channel.owner)).where(Channel.is_active == True)

    if search:
        query = query.where(Channel.name.ilike(f"%{search}%"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Channel.member_count.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    channels = list(result.scalars().unique().all())

    member_check = await db.execute(
        select(ChannelMember.channel_id, ChannelMember.role).where(ChannelMember.user_id == user.id)
    )
    membership_map = {row[0]: row[1] for row in member_check.all()}

    for ch in channels:
        ch.is_member = ch.id in membership_map
        ch.user_role = membership_map.get(ch.id)

    return channels, total


async def get_channel_by_id(db: AsyncSession, channel_id: UUID, user: User = None) -> Channel:
    result = await db.execute(
        select(Channel)
        .options(selectinload(Channel.owner), selectinload(Channel.members).selectinload(ChannelMember.user))
        .where(Channel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")

    if channel.type == "private" and user:
        is_member = any(m.user_id == user.id for m in channel.members)
        if not is_member and user.role != "super_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This is a private channel")

    return channel


async def update_channel(db: AsyncSession, channel_id: UUID, user: User, data: ChannelUpdate) -> Channel:
    channel = await get_channel_by_id(db, channel_id, user)
    if channel.owner_id != user.id and user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(channel, key, value)
    await db.flush()
    return channel


async def delete_channel(db: AsyncSession, channel_id: UUID, user: User) -> bool:
    channel = await get_channel_by_id(db, channel_id, user)
    if channel.owner_id != user.id and user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db.delete(channel)
    await db.flush()
    return True


async def join_channel(db: AsyncSession, channel_id: UUID, user: User) -> ChannelMember:
    channel = await get_channel_by_id(db, channel_id, user)

    existing = await db.execute(
        select(ChannelMember).where(ChannelMember.channel_id == channel_id, ChannelMember.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member")

    if channel.type == "private":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot join private channel directly")

    member = ChannelMember(channel_id=channel_id, user_id=user.id, role="member")
    db.add(member)
    channel.member_count += 1
    await db.flush()
    return member


async def leave_channel(db: AsyncSession, channel_id: UUID, user: User) -> bool:
    channel = await get_channel_by_id(db, channel_id, user)

    result = await db.execute(
        select(ChannelMember).where(ChannelMember.channel_id == channel_id, ChannelMember.user_id == user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a member")

    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot leave. Transfer ownership first.")

    await db.delete(member)
    channel.member_count = max(0, channel.member_count - 1)
    await db.flush()
    return True


async def get_channel_messages(
    db: AsyncSession, channel_id: UUID, user: User, page: int = 1, page_size: int = 50
) -> tuple[list[ChannelMessage], int]:
    channel = await get_channel_by_id(db, channel_id, user)

    is_member = any(m.user_id == user.id for m in channel.members)
    if not is_member and user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this channel")

    query = (
        select(ChannelMessage)
        .options(selectinload(ChannelMessage.sender))
        .where(ChannelMessage.channel_id == channel_id, ChannelMessage.is_deleted == False)
        .order_by(ChannelMessage.created_at.desc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    messages = list(result.scalars().unique().all())

    return messages, total


async def send_channel_message(
    db: AsyncSession, channel_id: UUID, user: User, data: ChannelMessageCreate
) -> ChannelMessage:
    channel = await get_channel_by_id(db, channel_id, user)

    member_result = await db.execute(
        select(ChannelMember).where(ChannelMember.channel_id == channel_id, ChannelMember.user_id == user.id)
    )
    member = member_result.scalar_one_or_none()
    if not member and user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")

    if not data.content and not data.image_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message must have content or image")

    message = ChannelMessage(
        channel_id=channel_id,
        sender_id=user.id,
        content=data.content,
        image_url=data.image_url,
    )
    db.add(message)
    await db.flush()
    return message


async def get_channel_members(db: AsyncSession, channel_id: UUID, user: User) -> list[ChannelMember]:
    channel = await get_channel_by_id(db, channel_id, user)

    result = await db.execute(
        select(ChannelMember)
        .options(selectinload(ChannelMember.user))
        .where(ChannelMember.channel_id == channel_id)
        .order_by(ChannelMember.joined_at)
    )
    return list(result.scalars().unique().all())


async def add_channel_member(db: AsyncSession, channel_id: UUID, user_id: UUID, admin: User) -> ChannelMember:
    channel = await get_channel_by_id(db, channel_id, admin)

    is_admin = admin.role == "super_admin"
    is_owner = channel.owner_id == admin.id
    if not is_admin and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    existing = await db.execute(
        select(ChannelMember).where(ChannelMember.channel_id == channel_id, ChannelMember.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already a member")

    member = ChannelMember(channel_id=channel_id, user_id=user_id, role="member")
    db.add(member)
    channel.member_count += 1
    await db.flush()
    return member


async def remove_channel_member(db: AsyncSession, channel_id: UUID, user_id: UUID, admin: User) -> bool:
    channel = await get_channel_by_id(db, channel_id, admin)

    is_admin = admin.role == "super_admin"
    is_owner = channel.owner_id == admin.id
    if not is_admin and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    result = await db.execute(
        select(ChannelMember).where(ChannelMember.channel_id == channel_id, ChannelMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if member.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the owner")

    await db.delete(member)
    channel.member_count = max(0, channel.member_count - 1)
    await db.flush()
    return True
