from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import joinedload, selectinload
from typing import Optional
from datetime import datetime
from app.database import AsyncSessionLocal
from app.dependencies import get_db, get_current_user
from app.models.project import Project, ProjectMember, ProjectInvitation, ProjectTask
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("")
@router.get("/")
async def list_projects(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Project).options(
        joinedload(Project.owner),
        joinedload(Project.members),
    )

    if category:
        query = query.where(Project.category == category)
    if status:
        query = query.where(Project.status == status)
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))

    total_q = select(func.count(Project.id))
    if category:
        total_q = total_q.where(Project.category == category)
    if status:
        total_q = total_q.where(Project.status == status)
    if search:
        total_q = total_q.where(Project.name.ilike(f"%{search}%"))
    total_result = await db.execute(total_q)
    total = total_result.scalar() or 0

    query = query.order_by(Project.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    projects = result.unique().scalars().all()

    return {
        "projects": [
            {
                "id": str(p.id),
                "name": p.name,
                "description": p.description[:200] if p.description else None,
                "tech_stack": p.tech_stack,
                "category": p.category,
                "status": p.status,
                "owner": {"id": str(p.owner.id), "full_name": p.owner.full_name, "avatar_url": p.owner.avatar_url},
                "member_count": len(p.members),
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in projects
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/my")
async def list_my_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owned_q = select(Project).options(
        joinedload(Project.owner),
        joinedload(Project.members).joinedload(ProjectMember.user),
        joinedload(Project.tasks),
    ).where(Project.owner_id == current_user.id).order_by(Project.updated_at.desc())
    owned_result = await db.execute(owned_q)
    owned = owned_result.unique().scalars().all()

    member_q = select(Project).options(
        joinedload(Project.owner),
        joinedload(Project.members).joinedload(ProjectMember.user),
        joinedload(Project.tasks),
    ).join(ProjectMember).where(ProjectMember.user_id == current_user.id).order_by(Project.updated_at.desc())
    member_result = await db.execute(member_q)
    member_of = member_result.unique().scalars().all()

    seen = set()
    projects = []
    for p in owned + member_of:
        if p.id not in seen:
            seen.add(p.id)
            membership = next((m for m in p.members if m.user_id == current_user.id), None)
            total_tasks = len(p.tasks)
            completed_tasks = sum(1 for t in p.tasks if t.status == "completed")
            projects.append({
                "id": str(p.id),
                "name": p.name,
                "description": p.description[:200] if p.description else None,
                "tech_stack": p.tech_stack,
                "category": p.category,
                "status": p.status,
                "owner": {"id": str(p.owner.id), "full_name": p.owner.full_name, "avatar_url": p.owner.avatar_url},
                "member_count": len(p.members),
                "task_count": total_tasks,
                "completed_task_count": completed_tasks,
                "my_role": membership.role if membership else "owner",
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            })

    return {"projects": projects}


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Project).options(
        joinedload(Project.owner),
        joinedload(Project.members).joinedload(ProjectMember.user),
        joinedload(Project.tasks).joinedload(ProjectTask.assignee),
        joinedload(Project.invitations),
    ).where(Project.id == project_id)
    result = await db.execute(q)
    project = result.unique().scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    memberships = [m for m in project.members if m.user_id == current_user.id]
    invitations = [i for i in project.invitations if i.user_id == current_user.id and i.status == "pending"]

    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "tech_stack": project.tech_stack,
            "category": project.category,
            "status": project.status,
            "owner": {"id": str(project.owner.id), "full_name": project.owner.full_name, "avatar_url": project.owner.avatar_url, "register_number": project.owner.register_number},
            "members": [
                {
                    "id": str(m.id),
                    "user_id": str(m.user.id),
                    "full_name": m.user.full_name,
                    "avatar_url": m.user.avatar_url,
                    "role": m.role,
                    "joined_at": m.joined_at.isoformat() if m.joined_at else None,
                }
                for m in project.members
            ],
            "tasks": [
                {
                    "id": str(t.id),
                    "title": t.title,
                    "description": t.description,
                    "assigned_to": str(t.assigned_to) if t.assigned_to else None,
                    "assignee_name": t.assignee.full_name if t.assignee else None,
                    "deadline": t.deadline.isoformat() if t.deadline else None,
                    "priority": t.priority,
                    "status": t.status,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in project.tasks
            ],
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            "is_member": len(memberships) > 0 or project.owner_id == current_user.id,
            "my_role": memberships[0].role if memberships else ("owner" if project.owner_id == current_user.id else None),
            "has_pending_invitation": len(invitations) > 0,
        }
    }


@router.post("/", status_code=201)
async def create_project(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        name=payload.get("name"),
        description=payload.get("description"),
        tech_stack=payload.get("tech_stack"),
        category=payload.get("category"),
        status=payload.get("status", "planning"),
        owner_id=current_user.id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return {"message": "Project created", "project_id": str(project.id)}


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can update the project")

    for field in ("name", "description", "tech_stack", "category", "status"):
        if field in payload:
            setattr(project, field, payload[field])

    project.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "Project updated"}


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete the project")

    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted"}


@router.post("/{project_id}/invite")
async def invite_to_project(
    project_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    m_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    membership = m_result.scalar_one_or_none()
    if project.owner_id != current_user.id and (not membership or membership.role not in ("admin", "owner")):
        raise HTTPException(status_code=403, detail="Only project admins can invite members")

    user_id = payload.get("user_id")
    u_result = await db.execute(select(User).where(User.id == user_id))
    user = u_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    e_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if e_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member")

    ei_result = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.project_id == project_id,
            ProjectInvitation.user_id == user_id,
            ProjectInvitation.status == "pending",
        )
    )
    if ei_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already has a pending invitation")

    invitation = ProjectInvitation(
        project_id=project_id,
        user_id=user_id,
        invited_by=current_user.id,
        status="pending",
    )
    db.add(invitation)

    notification = Notification(
        user_id=user_id,
        type="project_invite",
        title=f"You've been invited to join {project.name}",
        body=f"{current_user.full_name} invited you to collaborate on '{project.name}'",
        data={"project_id": project_id, "invited_by": str(current_user.id)},
    )
    db.add(notification)
    await db.commit()

    return {"message": "Invitation sent"}


@router.post("/{project_id}/join")
async def join_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    e_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    if e_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member")

    member = ProjectMember(project_id=project_id, user_id=current_user.id, role="member")
    db.add(member)

    if project.owner_id != current_user.id:
        notification = Notification(
            user_id=project.owner_id,
            type="project_join",
            title=f"{current_user.full_name} joined {project.name}",
            body=f"{current_user.full_name} has joined your project '{project.name}'",
            data={"project_id": project_id, "user_id": str(current_user.id)},
        )
        db.add(notification)

    await db.commit()
    return {"message": "Joined project"}


@router.post("/invitations/{invitation_id}/respond")
async def respond_invitation(
    invitation_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ProjectInvitation).where(ProjectInvitation.id == invitation_id))
    invitation = result.scalar_one_or_none()
    if not invitation or invitation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Invitation not found")

    action = payload.get("action")
    if action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")

    invitation.status = "accepted" if action == "accept" else "rejected"
    invitation.updated_at = datetime.utcnow()

    if action == "accept":
        e_result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == invitation.project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        if not e_result.scalar_one_or_none():
            member = ProjectMember(project_id=invitation.project_id, user_id=current_user.id, role="member")
            db.add(member)

    await db.commit()
    return {"message": f"Invitation {action}ed"}


@router.put("/{project_id}/members/{member_id}")
async def update_member_role(
    project_id: str,
    member_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id:
        m_result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        member = m_result.scalar_one_or_none()
        if not member or member.role not in ("admin", "owner"):
            raise HTTPException(status_code=403, detail="Only project admins can update roles")

    t_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id,
        )
    )
    target = t_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    target.role = payload.get("role", target.role)
    await db.commit()
    return {"message": "Member role updated"}


@router.delete("/{project_id}/members/{member_id}")
async def remove_member(
    project_id: str,
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id:
        m_result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        member = m_result.scalar_one_or_none()
        if not member or member.role not in ("admin", "owner"):
            raise HTTPException(status_code=403, detail="Only project admins can remove members")

    t_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id,
        )
    )
    target = t_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    if target.user_id == project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the project owner")

    await db.delete(target)
    await db.commit()
    return {"message": "Member removed"}


@router.post("/{project_id}/tasks")
async def create_task(
    project_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    m_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    membership = m_result.scalar_one_or_none()
    if project.owner_id != current_user.id and not membership:
        raise HTTPException(status_code=403, detail="Only project members can create tasks")

    task = ProjectTask(
        project_id=project_id,
        title=payload.get("title"),
        description=payload.get("description"),
        assigned_to=payload.get("assigned_to"),
        deadline=datetime.fromisoformat(payload["deadline"]) if payload.get("deadline") else None,
        priority=payload.get("priority", "medium"),
        status=payload.get("status", "pending"),
    )
    db.add(task)

    if task.assigned_to and task.assigned_to != current_user.id:
        notification = Notification(
            user_id=task.assigned_to,
            type="task_assigned",
            title=f"New task: {task.title}",
            body=f"You've been assigned a task in '{project.name}'",
            data={"project_id": project_id, "task_id": str(task.id)},
        )
        db.add(notification)

    await db.commit()
    await db.refresh(task)
    return {"message": "Task created", "task_id": str(task.id)}


@router.put("/{project_id}/tasks/{task_id}")
async def update_task(
    project_id: str,
    task_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t_result = await db.execute(
        select(ProjectTask).where(
            ProjectTask.id == task_id,
            ProjectTask.project_id == project_id,
        )
    )
    task = t_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field in ("title", "description", "priority", "status"):
        if field in payload:
            setattr(task, field, payload[field])
    if "assigned_to" in payload:
        task.assigned_to = payload["assigned_to"]
    if "deadline" in payload:
        task.deadline = datetime.fromisoformat(payload["deadline"]) if payload["deadline"] else None

    task.updated_at = datetime.utcnow()

    if payload.get("status") == "completed" and task.assigned_to and task.assigned_to != current_user.id:
        notification = Notification(
            user_id=task.assigned_to,
            type="task_completed",
            title=f"Task completed: {task.title}",
            body=f"A task in the project has been marked as completed",
            data={"project_id": project_id, "task_id": task_id},
        )
        db.add(notification)

    await db.commit()
    return {"message": "Task updated"}


@router.delete("/{project_id}/tasks/{task_id}")
async def delete_task(
    project_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t_result = await db.execute(
        select(ProjectTask).where(
            ProjectTask.id == task_id,
            ProjectTask.project_id == project_id,
        )
    )
    task = t_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()
    return {"message": "Task deleted"}
