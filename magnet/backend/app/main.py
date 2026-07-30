import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.config import settings
from app.middleware.cors import setup_cors
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.logging_mw import RequestLoggingMiddleware

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(os.path.dirname(BACKEND_DIR), "uploads")
from app.routers import (
    auth_router, users_router, posts_router, messages_router,
    channels_router, announcements_router, events_router,
    notifications_router, search_router, upload_router, admin_router,
    leaderboard_router, analytics_router, clubs_router, club_content_router, departments_router
)
from app.websockets.handlers import router as ws_router
from app.utils.firebase import initialize_firebase

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("magnet")


async def _create_fixed_accounts():
    """Auto-create Principal and Super Admin accounts if they don't exist."""
    from app.database import AsyncSessionLocal
    from app.models.user import User
    from app.utils.security import hash_password
    from sqlalchemy import select

    FIXED_ACCOUNTS = [
        {
            "email": "principal@unisphere.com",
            "password": "Principal@123",
            "full_name": "Principal",
            "role": "principal",
        },
        {
            "email": "admin@unisphere.com",
            "password": "Admin@123",
            "full_name": "Super Admin",
            "role": "super_admin",
        },
    ]

    async with AsyncSessionLocal() as db:
        for account in FIXED_ACCOUNTS:
            result = await db.execute(select(User).where(User.email == account["email"]))
            existing = result.scalar_one_or_none()
            if not existing:
                user = User(
                    email=account["email"],
                    password_hash=hash_password(account["password"]),
                    full_name=account["full_name"],
                    role=account["role"],
                    is_verified=True,
                    is_active=True,
                )
                db.add(user)
                logger.info(f"Created fixed account: {account['email']} ({account['role']})")
            else:
                logger.debug(f"Fixed account already exists: {account['email']}")
        await db.commit()


async def _seed_departments():
    """Auto-create all departments and HOD accounts if they don't exist.
    Also re-creates missing HOD accounts for existing departments.
    """
    from app.database import AsyncSessionLocal
    from app.models.department import Department
    from app.models.user import User, Hod
    from app.services.auth_service import create_user_with_role
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from fastapi import HTTPException

    SEED_DEPTS = [
        {
            "name": "B.E. Civil Engineering",
            "code": "CIVIL",
            "department_type": "Engineering",
            "description": "Department of Civil Engineering",
            "hod_email": "hodcivil@ksrct.ac.in",
            "hod_password": "Hodcivil@123",
            "hod_full_name": "Dr. P. Magesh Kumar",
            "hod_employee_id": "EMP001",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.E. Computer Science and Engineering",
            "code": "CSE",
            "department_type": "Engineering",
            "description": "Department of Computer Science and Engineering",
            "hod_email": "hodcse@ksrct.ac.in",
            "hod_password": "Hodcse@123",
            "hod_full_name": "Dr. S. Madhavi",
            "hod_employee_id": "EMP002",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.E. Electrical and Electronics Engineering",
            "code": "EEE",
            "department_type": "Engineering",
            "description": "Department of Electrical and Electronics Engineering",
            "hod_email": "hodeee@ksrct.ac.in",
            "hod_password": "Hodeee@123",
            "hod_full_name": "Dr. C. Rajasekaran",
            "hod_employee_id": "EMP003",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.E. Electronics and Communication Engineering",
            "code": "ECE",
            "department_type": "Engineering",
            "description": "Department of Electronics and Communication Engineering",
            "hod_email": "hodece@ksrct.ac.in",
            "hod_password": "Hodece@123",
            "hod_full_name": "Dr. C. Rajasekaran",
            "hod_employee_id": "EMP004",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.E. Electronics Engineering (VLSI Design and Technology)",
            "code": "VLSI",
            "department_type": "Engineering",
            "description": "Department of Electronics Engineering (VLSI Design and Technology)",
            "hod_email": "hodvlsi@ksrct.ac.in",
            "hod_password": "Hodvlsi@123",
            "hod_full_name": "Dr. R. Senthil Kumar",
            "hod_employee_id": "EMP005",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.E. Mechanical Engineering",
            "code": "MECH",
            "department_type": "Engineering",
            "description": "Department of Mechanical Engineering",
            "hod_email": "hodmech@ksrct.ac.in",
            "hod_password": "Hodmech@123",
            "hod_full_name": "Dr. A. Murugesan",
            "hod_employee_id": "EMP006",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.E. Mechatronics Engineering",
            "code": "MCT",
            "department_type": "Engineering",
            "description": "Department of Mechatronics Engineering",
            "hod_email": "hodmct@ksrct.ac.in",
            "hod_password": "Hodmct@123",
            "hod_full_name": "Dr. N. Tiruvenkadam",
            "hod_employee_id": "EMP007",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.Tech. Artificial Intelligence and Data Science",
            "code": "AIDS",
            "department_type": "Engineering",
            "description": "Department of Artificial Intelligence and Data Science",
            "hod_email": "hodaids@ksrct.ac.in",
            "hod_password": "Hodaids@123",
            "hod_full_name": "Dr. K. Sakthivel",
            "hod_employee_id": "EMP008",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.E. Artificial Intelligence and Machine Learning",
            "code": "AIML",
            "department_type": "Engineering",
            "description": "Department of Artificial Intelligence and Machine Learning",
            "hod_email": "hodaiml@ksrct.ac.in",
            "hod_password": "Hodaiml@123",
            "hod_full_name": "Dr. C. Rajan",
            "hod_employee_id": "EMP009",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.Tech. Information Technology",
            "code": "IT",
            "department_type": "Engineering",
            "description": "Department of Information Technology",
            "hod_email": "hodit@ksrct.ac.in",
            "hod_password": "Hodit@123",
            "hod_full_name": "Dr. S. Sarumathi",
            "hod_employee_id": "EMP010",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.Tech. Computer Science and Business Systems",
            "code": "CSBS",
            "department_type": "Engineering",
            "description": "Department of Computer Science and Business Systems",
            "hod_email": "hodcsbs@ksrct.ac.in",
            "hod_password": "Hodcsbs@123",
            "hod_full_name": "Dr. K. Sakthivel",
            "hod_employee_id": "EMP011",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.Tech. Biotechnology",
            "code": "BT",
            "department_type": "Engineering",
            "description": "Department of Biotechnology",
            "hod_email": "hodbt@ksrct.ac.in",
            "hod_password": "Hodbt@123",
            "hod_full_name": "Dr. B. Kalpana",
            "hod_employee_id": "EMP012",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.Tech. Food Technology",
            "code": "FT",
            "department_type": "Engineering",
            "description": "Department of Food Technology",
            "hod_email": "hodft@ksrct.ac.in",
            "hod_password": "Hodft@123",
            "hod_full_name": "Dr. K. Prabha",
            "hod_employee_id": "EMP013",
            "hod_designation": "Head of Department",
        },
        {
            "name": "B.Tech. Textile Technology",
            "code": "TT",
            "department_type": "Engineering",
            "description": "Department of Textile Technology",
            "hod_email": "hodtt@ksrct.ac.in",
            "hod_password": "Hodtt@123",
            "hod_full_name": "Dr. N. Sukumar",
            "hod_employee_id": "EMP014",
            "hod_designation": "Head of Department",
        },
    ]

    async with AsyncSessionLocal() as db:
        for dept_data in SEED_DEPTS:
            result = await db.execute(
                select(Department)
                .options(selectinload(Department.head))
                .where(Department.code == dept_data["code"])
            )
            dept = result.scalar_one_or_none()

            if dept:
                if dept.head_id and dept.head and dept.head.is_active:
                    logger.debug(f"Department already exists with valid HOD: {dept_data['code']}")
                    continue
                logger.info(f"Department {dept_data['code']} exists but HOD is missing/inactive. Recreating HOD account...")
            else:
                dept = Department(
                    name=dept_data["name"],
                    code=dept_data["code"],
                    department_type=dept_data.get("department_type"),
                    description=dept_data.get("description"),
                    status="active",
                    is_active=True,
                )
                db.add(dept)
                await db.flush()
                await db.refresh(dept)

            try:
                hod_user = await create_user_with_role(
                    db,
                    email=dept_data["hod_email"],
                    password=dept_data["hod_password"],
                    full_name=dept_data["hod_full_name"],
                    role="department_admin",
                    department_id=dept.id,
                )
            except HTTPException as e:
                if e.status_code == 409:
                    existing_user = (await db.execute(
                        select(User).where(User.email == dept_data["hod_email"])
                    )).scalar_one_or_none()
                    if existing_user:
                        hod_user = existing_user
                        hod_user.department_id = dept.id
                        hod_user.role = "department_admin"
                        hod_user.is_active = True
                    else:
                        logger.error(f"Failed to get HOD user for {dept_data['hod_email']}: {e}")
                        continue
                else:
                    raise

            dept.head_id = hod_user.id

            existing_hod_profile = (await db.execute(
                select(Hod).where(Hod.user_id == hod_user.id)
            )).scalar_one_or_none()

            if not existing_hod_profile:
                hod_profile = Hod(
                    user_id=hod_user.id,
                    employee_id=dept_data["hod_employee_id"],
                    designation=dept_data.get("hod_designation"),
                )
                db.add(hod_profile)

            logger.info(f"Seeded HOD for {dept.name} ({dept.code}): {hod_user.email}")

        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    try:
        initialize_firebase()
        logger.info("Firebase initialized")
    except Exception as e:
        logger.warning(f"Firebase init failed: {e}")
    try:
        from app.database import engine, Base
        import app.models  # noqa: F401 — ensure all models are registered
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
    try:
        await _create_fixed_accounts()
        logger.info("Fixed accounts verified")
    except Exception as e:
        logger.error(f"Failed to create fixed accounts: {e}")
    try:
        await _seed_departments()
        logger.info("Departments seeded")
    except Exception as e:
        logger.error(f"Failed to seed departments: {e}")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
app.add_middleware(RequestLoggingMiddleware)
setup_cors(app)

os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(posts_router, prefix="/api/v1")
app.include_router(messages_router, prefix="/api/v1")
app.include_router(channels_router, prefix="/api/v1")
app.include_router(announcements_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(upload_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(leaderboard_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(clubs_router, prefix="/api/v1")
app.include_router(club_content_router, prefix="/api/v1")
app.include_router(departments_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An internal error occurred"}},
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
