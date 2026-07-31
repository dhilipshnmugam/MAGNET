from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.posts import router as posts_router
from app.routers.messages import router as messages_router
from app.routers.channels import router as channels_router
from app.routers.announcements import router as announcements_router
from app.routers.events import router as events_router
from app.routers.notifications import router as notifications_router
from app.routers.search import router as search_router
from app.routers.upload import router as upload_router
from app.routers.admin import router as admin_router
from app.routers.leaderboard import router as leaderboard_router
from app.routers.analytics import router as analytics_router
from app.routers.clubs import router as clubs_router
from app.routers.club_content import router as club_content_router
from app.routers.club_roles import router as club_roles_router
from app.routers.projects import router as projects_router
from app.routers.departments import router as departments_router

__all__ = [
    "auth_router",
    "users_router",
    "posts_router",
    "messages_router",
    "channels_router",
    "announcements_router",
    "events_router",
    "notifications_router",
    "search_router",
    "upload_router",
    "admin_router",
    "leaderboard_router",
    "analytics_router",
    "clubs_router",
    "club_content_router",
    "club_roles_router",
    "projects_router",
    "departments_router",
]
