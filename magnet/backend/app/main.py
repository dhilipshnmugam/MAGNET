import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.config import settings
from app.middleware.cors import setup_cors
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.logging_mw import RequestLoggingMiddleware
from app.routers import (
    auth_router, users_router, posts_router, messages_router,
    channels_router, announcements_router, events_router,
    notifications_router, search_router, upload_router, admin_router,
    leaderboard_router, analytics_router, clubs_router
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    try:
        initialize_firebase()
        logger.info("Firebase initialized")
    except Exception as e:
        logger.warning(f"Firebase init failed: {e}")
    try:
        await _create_fixed_accounts()
        logger.info("Fixed accounts verified")
    except Exception as e:
        logger.error(f"Failed to create fixed accounts: {e}")
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
