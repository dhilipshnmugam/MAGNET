from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from datetime import datetime
from app.dependencies import get_db, get_current_user
from app.models.club import Club, ClubMember
from app.models.club_extras import ClubRole, ClubAssignment
from app.models.user import User
from app.utils.datetime_utils import utc_isoformat

router = APIRouter(prefix="/clubs", tags=["Club Roles"])


@router.get("/{club_id}/roles")
async def list_club_roles(
    club_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    q = select(ClubMember).options(
        joinedload(ClubMember.user),
        joinedload(ClubMember.roles),
    ).where(ClubMember.club_id == club_id).order_by(ClubMember.joined_at)
    result = await db.execute(q)
    members = result.unique().scalars().all()

    return {
        "members": [
            {
                "member_id": str(m.id),
                "user_id": str(m.user.id),
                "full_name": m.user.full_name,
                "avatar_url": m.user.avatar_url,
                "base_role": m.role,
                "roles": [{"id": str(r.id), "role": r.role} for r in m.roles],
            }
            for m in members
        ]
    }


@router.post("/{club_id}/members/{member_id}/roles")
async def add_member_role(
    club_id: str,
    member_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if club.owner_id != current_user.id:
        m_result = await db.execute(
            select(ClubMember).where(
                ClubMember.club_id == club_id,
                ClubMember.user_id == current_user.id,
            )
        )
        membership = m_result.scalar_one_or_none()
        if not membership or membership.role not in ("admin", "owner"):
            raise HTTPException(status_code=403, detail="Only club admins can manage roles")

    m_result = await db.execute(
        select(ClubMember).where(
            ClubMember.id == member_id,
            ClubMember.club_id == club_id,
        )
    )
    member = m_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    role_name = payload.get("role")
    if not role_name:
        raise HTTPException(status_code=400, detail="Role name is required")

    e_result = await db.execute(
        select(ClubRole).where(
            ClubRole.club_member_id == member_id,
            ClubRole.role == role_name,
        )
    )
    if e_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role already assigned")

    role = ClubRole(club_member_id=member_id, role=role_name)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return {"message": "Role added", "role_id": str(role.id)}


@router.delete("/{club_id}/members/{member_id}/roles/{role_id}")
async def remove_member_role(
    club_id: str,
    member_id: str,
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if club.owner_id != current_user.id:
        m_result = await db.execute(
            select(ClubMember).where(
                ClubMember.club_id == club_id,
                ClubMember.user_id == current_user.id,
            )
        )
        membership = m_result.scalar_one_or_none()
        if not membership or membership.role not in ("admin", "owner"):
            raise HTTPException(status_code=403, detail="Only club admins can manage roles")

    r_result = await db.execute(
        select(ClubRole).where(
            ClubRole.id == role_id,
            ClubRole.club_member_id == member_id,
        )
    )
    role = r_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    await db.delete(role)
    await db.commit()
    return {"message": "Role removed"}


@router.get("/{club_id}/assignments")
async def list_club_assignments(
    club_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    q = select(ClubAssignment).options(
        joinedload(ClubAssignment.member).joinedload(ClubMember.user),
        joinedload(ClubAssignment.assigner),
    ).where(ClubAssignment.member.has(club_id=club_id)).order_by(ClubAssignment.created_at.desc())
    result = await db.execute(q)
    assignments = result.unique().scalars().all()

    return {
        "assignments": [
            {
                "id": str(a.id),
                "title": a.title,
                "description": a.description,
                "member_name": a.member.user.full_name if a.member else None,
                "member_id": str(a.member.id) if a.member else None,
                "assigned_by": a.assigner.full_name if a.assigner else None,
                "deadline": utc_isoformat(a.deadline),
                "priority": a.priority,
                "status": a.status,
                "created_at": utc_isoformat(a.created_at),
            }
            for a in assignments
        ]
    }


@router.post("/{club_id}/assignments")
async def create_assignment(
    club_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if club.owner_id != current_user.id:
        m_result = await db.execute(
            select(ClubMember).where(
                ClubMember.club_id == club_id,
                ClubMember.user_id == current_user.id,
            )
        )
        membership = m_result.scalar_one_or_none()
        if not membership or membership.role not in ("admin", "owner"):
            raise HTTPException(status_code=403, detail="Only club admins can create assignments")

    member_id = payload.get("member_id")
    m_result = await db.execute(
        select(ClubMember).where(
            ClubMember.id == member_id,
            ClubMember.club_id == club_id,
        )
    )
    member = m_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Club member not found")

    assignment = ClubAssignment(
        club_member_id=member_id,
        assigned_by=current_user.id,
        title=payload.get("title"),
        description=payload.get("description"),
        deadline=datetime.fromisoformat(payload["deadline"]) if payload.get("deadline") else None,
        priority=payload.get("priority", "medium"),
        status=payload.get("status", "pending"),
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return {"message": "Assignment created", "assignment_id": str(assignment.id)}


@router.put("/{club_id}/assignments/{assignment_id}")
async def update_assignment(
    club_id: str,
    assignment_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a_result = await db.execute(
        select(ClubAssignment).where(ClubAssignment.id == assignment_id)
    )
    assignment = a_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    for field in ("title", "description", "priority", "status"):
        if field in payload:
            setattr(assignment, field, payload[field])
    if "deadline" in payload:
        assignment.deadline = datetime.fromisoformat(payload["deadline"]) if payload["deadline"] else None

    assignment.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "Assignment updated"}
