"""One-time script: create student accounts from the provided list."""
import asyncio
from uuid import uuid4
from datetime import datetime
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User, Student
from app.models.department import Department
from app.models.notification import NotificationPreference
from app.models.points import Leaderboard
from app.utils.security import hash_password

STUDENTS = [
    # (register_number, name, college, degree, branch)
    ("737724321001", "ABIBUR RAHAMAN S", "KSRCT", "B.TECH", "AIDS"),
    ("737724322044", "ARSHA BEGUM J", "KSRCT", "B.TECH", "AIDS"),
    ("737724321006", "ATHITYAA A", "KSRCT", "B.TECH", "AIDS"),
    ("737724322047", "DHANUSYA R", "KSRCT", "B.TECH", "AIDS"),
    ("737724321011", "DURAIRAJAN G", "KSRCT", "B.TECH", "AIDS"),
    ("737724321017", "HARISH M", "KSRCT", "B.TECH", "AIDS"),
    ("737724322050", "HEMALATHA M", "KSRCT", "B.TECH", "AIDS"),
    ("737724322058", "RUBASREE M N", "KSRCT", "B.TECH", "AIDS"),
    ("737724321034", "SERAN S", "KSRCT", "B.TECH", "AIDS"),
    ("737724322059", "SINDHU S", "KSRCT", "B.TECH", "AIDS"),
    ("737724321040", "VIKAS T", "KSRCT", "B.TECH", "AIDS"),
    ("737714821004", "ALLWIN JEROME J", "KSRCT", "B.E", "AIML"),
    ("737714822040", "ARSHIYA NASIRIN M", "KSRCT", "B.E", "AIML"),
    ("737714822044", "DHINESHA G", "KSRCT", "B.E", "AIML"),
    ("737714821008", "DHIVYAKANTH P", "KSRCT", "B.E", "AIML"),
    ("737714821011", "HARDHIK V", "KSRCT", "B.E", "AIML"),
    ("737714821013", "HARIKARTHICK P", "KSRCT", "B.E", "AIML"),
    ("737714821019", "LESANTH N", "KSRCT", "B.E", "AIML"),
    ("737714821020", "LOKESH S", "KSRCT", "B.E", "AIML"),
    ("737714821026", "NAVEEN RAJ B", "KSRCT", "B.E", "AIML"),
    ("737714821029", "PAVITHRAN G", "KSRCT", "B.E", "AIML"),
    ("737714821030", "PRAVEEN S", "KSRCT", "B.E", "AIML"),
    ("737714822054", "ROSHINI K", "KSRCT", "B.E", "AIML"),
    ("737714821033", "SAKTHIVEL E", "KSRCT", "B.E", "AIML"),
    ("737714822056", "SHARUMATHI P", "KSRCT", "B.E", "AIML"),
    ("737714821038", "THARUNKUMAR R", "KSRCT", "B.E", "AIML"),
    ("737724422048", "MYTHRA R", "KSRCT", "B.TECH", "CSBS"),
    ("737724422057", "SRIMATHI S", "KSRCT", "B.TECH", "CSBS"),
    ("737724421031", "SUNDARA RAGHAV G", "KSRCT", "B.TECH", "CSBS"),
    ("737724421033", "THAMEMUL ANZARI F", "KSRCT", "B.TECH", "CSBS"),
    ("737710422075", "ASHWINI R P", "KSRCT", "B.E", "CSE"),
    ("737710422078", "DHARANIPRIYA R M", "KSRCT", "B.E", "CSE"),
    ("737710421011", "EZHIL ANAND V", "KSRCT", "B.E", "CSE"),
    ("737710421013", "GOUTHAM P", "KSRCT", "B.E", "CSE"),
    ("737710422086", "INDHU M", "KSRCT", "B.E", "CSE"),
    ("737710421032", "MOHANAVEL A", "KSRCT", "B.E", "CSE"),
    ("737710421033", "MOULEESHWARAN V", "KSRCT", "B.E", "CSE"),
    ("737710422098", "NITHIYASRI V", "KSRCT", "B.E", "CSE"),
    ("737710421035", "PERANANDHA K L", "KSRCT", "B.E", "CSE"),
    ("737710422103", "PRADEEPA S", "KSRCT", "B.E", "CSE"),
    ("737710422109", "SANJANA S", "KSRCT", "B.E", "CSE"),
    ("737710421050", "SHANMUGESHWARA A", "KSRCT", "B.E", "CSE"),
    ("737710422116", "SUBASREE R", "KSRCT", "B.E", "CSE"),
    ("737710422117", "SUBHIKSHA S", "KSRCT", "B.E", "CSE"),
    ("737710421064", "VARUN A K", "KSRCT", "B.E", "CSE"),
    ("737710421065", "VASANTH S", "KSRCT", "B.E", "CSE"),
    ("737710422123", "WINESHA P S", "KSRCT", "B.E", "CSE"),
    ("737720521002", "AANOOR ELAVARASAN M", "KSRCT", "B.TECH", "IT"),
    ("737720522079", "ABINAYA S", "KSRCT", "B.TECH", "IT"),
    ("737720522080", "ABIRAMI K", "KSRCT", "B.TECH", "IT"),
    ("737720522083", "ASWATHY S", "KSRCT", "B.TECH", "IT"),
    ("737720521015", "DAVIS GAVRIL T", "KSRCT", "B.TECH", "IT"),
    ("737720521016", "DEEPAN S", "KSRCT", "B.TECH", "IT"),
    ("737720521020", "DILEEP PRASANTH N Y", "KSRCT", "B.TECH", "IT"),
    ("737720522094", "KARI VIKASHINI G", "KSRCT", "B.TECH", "IT"),
    ("737720521034", "KARTHIKEYAN R", "KSRCT", "B.TECH", "IT"),
    ("737720522099", "MALATHI P D", "KSRCT", "B.TECH", "IT"),
    ("737720522100", "MANEESHA S", "KSRCT", "B.TECH", "IT"),
    ("737720521048", "NIRANJAN S", "KSRCT", "B.TECH", "IT"),
    ("737720522108", "POONGULALI G", "KSRCT", "B.TECH", "IT"),
    ("737720522115", "SANGAVI B", "KSRCT", "B.TECH", "IT"),
    ("737720521066", "SARATHY M", "KSRCT", "B.TECH", "IT"),
    ("737762222025", "ABINAYA M", "KSRCT", "MCA", "MCA"),
    ("737762222026", "MADHU MITHA P", "KSRCT", "MCA", "MCA"),
    ("737762222028", "MADHUMITHA V", "KSRCT", "MCA", "MCA"),
]

# MCA department doesn't exist yet — will be created on the fly
MCA_DEPT = {"name": "Master of Computer Applications", "code": "MCA", "department_type": "MCA"}


def make_email(name: str) -> str:
    cleaned = "".join(c.lower() for c in name if c.isalpha())
    return f"{cleaned}@gmail.com"


def make_password(name: str) -> str:
    cleaned = "".join(c for c in name if c.isalpha())
    return cleaned.capitalize() + "@123"


async def main():
    created = 0
    skipped = 0
    failed = []

    async with AsyncSessionLocal() as db:
        # 1. Ensure MCA department exists
        dept_map = {}
        result = await db.execute(select(Department))
        for d in result.scalars().all():
            dept_map[d.code] = d

        if "MCA" not in dept_map:
            mca_dept = Department(
                id=uuid4(),
                name=MCA_DEPT["name"],
                code=MCA_DEPT["code"],
                department_type=MCA_DEPT["department_type"],
                description="Master of Computer Applications",
                status="active",
                is_active=True,
            )
            db.add(mca_dept)
            await db.flush()
            dept_map["MCA"] = mca_dept
            print(f"Created missing department: MCA ({MCA_DEPT['name']})")

        now = datetime.utcnow()

        for regno, name, college, degree, branch in STUDENTS:
            try:
                email = make_email(name)
                password = make_password(name)

                # Check duplicate by register_number
                existing = await db.execute(
                    select(User).where(User.register_number == regno)
                )
                if existing.scalar_one_or_none():
                    skipped += 1
                    continue

                dept = dept_map.get(branch)
                if not dept:
                    failed.append((regno, name, f"Unknown branch: {branch}"))
                    continue

                user = User(
                    id=uuid4(),
                    email=email,
                    password_hash=hash_password(password),
                    full_name=name,
                    role="student",
                    department_id=dept.id,
                    register_number=regno,
                    college_name=college,
                    is_verified=True,
                    is_active=True,
                    created_at=now,
                    updated_at=now,
                )
                db.add(user)
                await db.flush()

                student = Student(
                    id=uuid4(),
                    user_id=user.id,
                    college_id=regno,
                    year_of_study=1,
                    semester=1,
                )
                db.add(student)

                prefs = NotificationPreference(user_id=user.id)
                db.add(prefs)

                lb = Leaderboard(user_id=user.id)
                db.add(lb)

                created += 1
                if created <= 5 or created % 10 == 0:
                    print(f"  Created: {name} ({email})")

            except Exception as e:
                failed.append((regno, name, str(e)))

        await db.commit()

    print(f"\n{'='*50}")
    print(f"Done! Created: {created}, Skipped (duplicates): {skipped}")
    if failed:
        print(f"Failed: {len(failed)}")
        for regno, name, reason in failed:
            print(f"  {regno} {name}: {reason}")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())
