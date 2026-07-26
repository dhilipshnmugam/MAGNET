"""Seed script: creates departments, test users for all roles, and posts/events."""
import asyncio
from uuid import uuid4
from datetime import datetime, timedelta
from sqlalchemy import text
from app.database import engine, AsyncSessionLocal
from app.models import *
from app.utils.security import hash_password


async def seed():
    async with AsyncSessionLocal() as db:
        # 1. Departments
        dept_cs = Department(id=uuid4(), name="Computer Science", code="CS", description="CS Department", is_active=True)
        dept_ece = Department(id=uuid4(), name="Electronics", code="ECE", description="ECE Department", is_active=True)
        dept_me = Department(id=uuid4(), name="Mechanical", code="ME", description="ME Department", is_active=True)
        dept_admin = Department(id=uuid4(), name="Administration", code="ADMIN", description="Admin Dept", is_active=True)
        db.add_all([dept_cs, dept_ece, dept_me, dept_admin])
        await db.flush()

        pw = hash_password("Password123!")
        now = datetime.utcnow()

        # 2. Admin / Principal
        admin_user = User(
            id=uuid4(), email="principal@magnet.com", password_hash=pw,
            full_name="Principal", role="admin",
            department_id=dept_admin.id, is_verified=True, is_active=True, created_at=now, updated_at=now,
        )
        admin2 = User(
            id=uuid4(), email="admin@magnet.com", password_hash=pw,
            full_name="Admin", role="admin",
            department_id=dept_admin.id, is_verified=True, is_active=True, created_at=now, updated_at=now,
        )

        # 3. Faculty / HODs
        faculty_hod = User(
            id=uuid4(), email="hod.cs@magnet.com", password_hash=pw,
            full_name="HOD CS", role="faculty",
            department_id=dept_cs.id, is_verified=True, is_active=True, created_at=now, updated_at=now,
        )
        faculty2 = User(
            id=uuid4(), email="faculty.ece@magnet.com", password_hash=pw,
            full_name="Faculty ECE", role="faculty",
            department_id=dept_ece.id, is_verified=True, is_active=True, created_at=now, updated_at=now,
        )
        faculty3 = User(
            id=uuid4(), email="faculty.me@magnet.com", password_hash=pw,
            full_name="Faculty ME", role="faculty",
            department_id=dept_me.id, is_verified=True, is_active=True, created_at=now, updated_at=now,
        )

        # 4. Students
        students = []
        student_data = [
            ("alice@magnet.com", "Student 1", "CS2023001", dept_cs.id, 3, 5, "A"),
            ("bob@magnet.com", "Student 2", "CS2023002", dept_cs.id, 2, 3, "A"),
            ("charlie@magnet.com", "Student 3", "ECE2022001", dept_ece.id, 4, 7, "B"),
            ("diana@magnet.com", "Student 4", "ME2024001", dept_me.id, 1, 1, "A"),
            ("eve@magnet.com", "Student 5", "CS2024003", dept_cs.id, 1, 2, "A"),
        ]
        for email, name, cid, dept_id, yr, sem, sec in student_data:
            s = User(
                id=uuid4(), email=email, password_hash=pw,
                full_name=name, role="student",
                department_id=dept_id, is_verified=True, is_active=True,
                created_at=now, updated_at=now,
            )
            students.append(s)
            stu_profile = Student(
                id=uuid4(), user_id=s.id, college_id=cid,
                year_of_study=yr, semester=sem, section=sec,
                admission_year=2023, created_at=now, updated_at=now,
            )
            db.add(stu_profile)

        # Faculty profiles
        for f, emp_id, desig in [
            (faculty_hod, "EMP001", "Head of Department"),
            (faculty2, "EMP002", "Associate Professor"),
            (faculty3, "EMP003", "Assistant Professor"),
        ]:
            fp = Faculty(id=uuid4(), user_id=f.id, employee_id=emp_id, designation=desig, created_at=now, updated_at=now)
            db.add(fp)

        db.add_all([admin_user, admin2, faculty_hod, faculty2, faculty3] + students)
        await db.flush()

        # 5. Notification preferences + leaderboard for all
        all_users = [admin_user, admin2, faculty_hod, faculty2, faculty3] + students
        for u in all_users:
            db.add(NotificationPreference(user_id=u.id))
            db.add(Leaderboard(user_id=u.id))
        await db.flush()

        # 6. Some posts
        for user, content in [
            (students[0], "Welcome to the new semester!"),
            (students[1], "Anyone interested in forming a study group for Data Structures?"),
            (students[2], "Just finished my final year project on IoT-based smart agriculture."),
            (faculty_hod, "CS Department seminar on Cloud Computing this Friday at 3 PM in Hall A."),
            (faculty2, "ECE students: Lab sessions rescheduled to Thursday this week."),
            (admin_user, "Annual tech fest registrations are now open!"),
        ]:
            p = Post(
                id=uuid4(), author_id=user.id, content=content,
                visibility="public", is_pinned=False, is_approved=True,
                like_count=0, comment_count=0, created_at=now, updated_at=now,
            )
            db.add(p)
        await db.flush()

        # 7. Some events
        events_data = [
            (admin_user, "Tech Fest 2026", "Annual technical festival of the college", 5, "Hackathon"),
            (faculty_hod, "CS Seminar: Cloud Computing", "Hands-on workshop on AWS and Azure", 2, "Seminar"),
            (faculty2, "ECE Project Exhibition", "Showcase of final year ECE projects", 10, "Exhibition"),
            (students[0], "Study Group: Data Structures", "Weekly DSA problem-solving sessions", 0, "Meeting"),
        ]
        for creator, title, desc, days, etype in events_data:
            e = Event(
                id=uuid4(), creator_id=creator.id, title=title, description=desc,
                event_date=now + timedelta(days=days), event_type=etype,
                rsvp_count=0, created_at=now, updated_at=now,
            )
            db.add(e)
        await db.flush()

        # 8. Announcements
        db.add(Announcement(
            id=uuid4(), author_id=admin_user.id, title="College Holiday Notice",
            content="College will remain closed on July 20th.",
            target_type="all", is_pinned=True, is_active=True,
            created_at=now, updated_at=now,
        ))
        db.add(Announcement(
            id=uuid4(), author_id=faculty_hod.id, title="CS Department: Assignment Deadline Extended",
            content="The assignment deadline for Cloud Computing has been extended to July 25th.",
            target_type="department", is_pinned=False, is_active=True,
            created_at=now, updated_at=now,
        ))
        await db.flush()

        await db.commit()
        print("\nSeed data created successfully.")


asyncio.run(seed())
