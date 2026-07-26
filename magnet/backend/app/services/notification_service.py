"""
Notification Service
====================
Core notification logic: create, query, mark-read, push via WebSocket + FCM + email.
All functions are async and work with the existing DB session pattern.
"""
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.notification import Notification, FCMToken, NotificationPreference
from app.models.user import User
from app.utils.firebase import send_push_notification
from app.utils.email import send_email

logger = logging.getLogger("magnet.notifications")


# ── Notification type → preference field mapping ──────────────────────
_PREF_MAP = {
    "post": "post_notifs",
    "like": "like_notifs",
    "comment": "comment_notifs",
    "mention": "mention_notifs",
    "event": "event_notifs",
    "event_reminder": "event_notifs",
    "approval": "approval_notifs",
    "rejected": "approval_notifs",
    "leaderboard": "leaderboard_notifs",
    "message": "message_notifs",
    "announcement": "announcement_notifs",
    "channel_invite": "channel_notifs",
    "system": None,
}

_NOTIFICATION_ICONS = {
    "post": "file-text",
    "like": "heart",
    "comment": "message-circle",
    "mention": "at-sign",
    "event": "calendar",
    "event_reminder": "bell",
    "approval": "check-circle",
    "rejected": "x-circle",
    "leaderboard": "trophy",
    "message": "mail",
    "announcement": "megaphone",
    "channel_invite": "hash",
    "system": "info",
}


# ══════════════════════════════════════════════════════════════════════
#  CORE: create notification + push
# ══════════════════════════════════════════════════════════════════════

async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    notif_type: str,
    title: str,
    body: str,
    ref_type: str = None,
    ref_id: UUID = None,
    sender_id: UUID = None,
    sender_name: str = None,
    sender_avatar: str = None,
    send_push: bool = True,
    send_email_notification: bool = False,
) -> Notification | None:
    """Create a notification, respecting user preferences, and push via WS/FCM/email."""

    # ── Check preferences ──
    prefs = await _get_prefs(db, user_id)
    if prefs and not prefs.push_enabled:
        return None

    pref_attr = _PREF_MAP.get(notif_type)
    if pref_attr and prefs and not getattr(prefs, pref_attr, True):
        return None

    # ── Create DB record ──
    notification = Notification(
        user_id=user_id,
        sender_id=sender_id,
        type=notif_type,
        title=title,
        body=body,
        ref_type=ref_type,
        ref_id=ref_id,
        sender_name=sender_name,
        sender_avatar=sender_avatar,
    )
    db.add(notification)
    await db.flush()

    # ── Real-time WebSocket push ──
    try:
        from app.websockets.connection_manager import manager
        ws_payload = {
            "type": "notification",
            "notification": {
                "id": str(notification.id),
                "type": notif_type,
                "title": title,
                "body": body,
                "ref_type": ref_type,
                "ref_id": str(ref_id) if ref_id else None,
                "sender_name": sender_name,
                "sender_avatar": sender_avatar,
                "is_read": False,
                "created_at": notification.created_at.isoformat() if notification.created_at else None,
            },
        }
        await manager.send_to_user(str(user_id), ws_payload)
    except Exception as e:
        logger.warning(f"WebSocket notification push failed: {e}")

    # ── FCM push ──
    if send_push:
        try:
            token_result = await db.execute(
                select(FCMToken.token).where(
                    FCMToken.user_id == user_id, FCMToken.is_active == True
                )
            )
            tokens = [row[0] for row in token_result.all()]
            if tokens:
                send_push_notification(
                    tokens, title, body,
                    {"type": notif_type, "ref_id": str(ref_id) if ref_id else ""},
                )
        except Exception as e:
            logger.warning(f"FCM push failed: {e}")

    # ── Email notification ──
    if send_email_notification and prefs and prefs.email_enabled:
        try:
            user_result = await db.execute(select(User.email).where(User.id == user_id))
            email_row = user_result.scalar_one_or_none()
            if email_row:
                await send_email(
                    to=email_row,
                    subject=f"Magnet: {title}",
                    body=body,
                )
        except Exception as e:
            logger.warning(f"Email notification failed: {e}")

    return notification


# ══════════════════════════════════════════════════════════════════════
#  CONVENIENCE NOTIFIERS (called from other services)
# ══════════════════════════════════════════════════════════════════════

async def notify_new_post(db: AsyncSession, author: User, post_id: UUID):
    """Notify department users about a new public/department post."""
    from sqlalchemy import or_
    from app.models.post import Post
    from app.models.user import User as UserModel

    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        return

    target_query = select(UserModel.id).where(
        UserModel.id != author.id,
        UserModel.is_active == True,
    )
    if post.visibility == "department" and author.department_id:
        target_query = target_query.where(UserModel.department_id == author.department_id)

    result = await db.execute(target_query.limit(500))
    user_ids = [row[0] for row in result.all()]

    for uid in user_ids:
        await create_notification(
            db, uid, "post",
            title="New Post",
            body=f"{author.full_name} shared a new post",
            ref_type="post", ref_id=post_id,
            sender_id=author.id, sender_name=author.full_name, sender_avatar=author.avatar_url,
        )


async def notify_like(db: AsyncSession, liker: User, post_author_id: UUID, post_id: UUID):
    """Notify the post author that someone liked their post."""
    if liker.id == post_author_id:
        return

    await create_notification(
        db, post_author_id, "like",
        title="New Like",
        body=f"{liker.full_name} liked your post",
        ref_type="post", ref_id=post_id,
        sender_id=liker.id, sender_name=liker.full_name, sender_avatar=liker.avatar_url,
    )


async def notify_comment(db: AsyncSession, commenter: User, post_author_id: UUID, post_id: UUID, comment_preview: str):
    """Notify the post author about a new comment."""
    if commenter.id == post_author_id:
        return

    preview = comment_preview[:80] + ("..." if len(comment_preview) > 80 else "")
    await create_notification(
        db, post_author_id, "comment",
        title="New Comment",
        body=f"{commenter.full_name} commented: \"{preview}\"",
        ref_type="post", ref_id=post_id,
        sender_id=commenter.id, sender_name=commenter.full_name, sender_avatar=commenter.avatar_url,
    )


async def notify_mention(db: AsyncSession, mentioner: User, mentioned_user_id: UUID, ref_type: str, ref_id: UUID):
    """Notify a mentioned user."""
    if mentioner.id == mentioned_user_id:
        return

    await create_notification(
        db, mentioned_user_id, "mention",
        title="You were mentioned",
        body=f"{mentioner.full_name} mentioned you in a {ref_type}",
        ref_type=ref_type, ref_id=ref_id,
        sender_id=mentioner.id, sender_name=mentioner.full_name, sender_avatar=mentioner.avatar_url,
    )


async def notify_event_created(db: AsyncSession, creator: User, event_id: UUID, event_title: str):
    """Notify active users about a new event."""
    from app.models.user import User as UserModel

    result = await db.execute(
        select(UserModel.id).where(
            UserModel.id != creator.id,
            UserModel.is_active == True,
        ).limit(500)
    )
    user_ids = [row[0] for row in result.all()]

    for uid in user_ids:
        await create_notification(
            db, uid, "event",
            title="New Event",
            body=f"{creator.full_name} created event: \"{event_title}\"",
            ref_type="event", ref_id=event_id,
            sender_id=creator.id, sender_name=creator.full_name, sender_avatar=creator.avatar_url,
        )


async def notify_event_reminder(db: AsyncSession, user_id: UUID, event_id: UUID, event_title: str, hours_until: int):
    """Send an event reminder notification."""
    time_label = f"in {hours_until} hour{'s' if hours_until != 1 else ''}" if hours_until > 0 else "now"
    await create_notification(
        db, user_id, "event_reminder",
        title="Event Reminder",
        body=f"\"{event_title}\" starts {time_label}",
        ref_type="event", ref_id=event_id,
        send_push=True,
    )


async def notify_approval(db: AsyncSession, user_id: UUID, status: str, request_type: str, review_note: str = None):
    """Notify user that their request was approved."""
    body = f"Your {request_type} request has been approved."
    if review_note:
        body += f" Note: {review_note}"

    await create_notification(
        db, user_id, "approval",
        title="Request Approved",
        body=body,
        ref_type="approval",
    )


async def notify_rejected(db: AsyncSession, user_id: UUID, request_type: str, review_note: str = None):
    """Notify user that their request was rejected."""
    body = f"Your {request_type} request has been rejected."
    if review_note:
        body += f" Reason: {review_note}"

    await create_notification(
        db, user_id, "rejected",
        title="Request Rejected",
        body=body,
        ref_type="approval",
    )


async def notify_leaderboard_update(db: AsyncSession, user_id: UUID, rank: int, period: str, points: int):
    """Notify a user about their leaderboard ranking update."""
    period_label = period.capitalize()
    await create_notification(
        db, user_id, "leaderboard",
        title="Leaderboard Update",
        body=f"You're ranked #{rank} on the {period_label} leaderboard with {points} points!",
        ref_type="leaderboard",
    )


async def notify_system(db: AsyncSession, user_id: UUID, title: str, body: str, ref_type: str = None, ref_id: UUID = None):
    """Send a system notification."""
    await create_notification(
        db, user_id, "system",
        title=title, body=body,
        ref_type=ref_type, ref_id=ref_id,
    )


# ══════════════════════════════════════════════════════════════════════
#  BULK / QUERY FUNCTIONS
# ══════════════════════════════════════════════════════════════════════

async def get_notifications(
    db: AsyncSession, user: User, page: int = 1, page_size: int = 20,
    unread_only: bool = False, notif_type: str = None,
) -> tuple[list[Notification], int]:
    query = select(Notification).where(Notification.user_id == user.id)

    if unread_only:
        query = query.where(Notification.is_read == False)
    if notif_type:
        query = query.where(Notification.type == notif_type)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Notification.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    notifications = list(result.scalars().all())

    return notifications, total


async def mark_notification_read(db: AsyncSession, notification_id: UUID, user: User) -> bool:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        return False
    notification.is_read = True
    await db.flush()
    return True


async def mark_all_read(db: AsyncSession, user: User) -> bool:
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == user.id, Notification.is_read == False
        )
    )
    for notif in result.scalars().all():
        notif.is_read = True
    await db.flush()
    return True


async def get_unread_count(db: AsyncSession, user: User) -> int:
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user.id, Notification.is_read == False
        )
    )
    return result.scalar()


async def delete_old_notifications(db: AsyncSession, days: int = 90) -> int:
    """Delete notifications older than N days. Called by background scheduler."""
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(Notification).where(Notification.created_at < cutoff)
    )
    old = result.scalars().all()
    for n in old:
        await db.delete(n)
    await db.flush()
    return len(old)


# ══════════════════════════════════════════════════════════════════════
#  FCM TOKEN MANAGEMENT
# ══════════════════════════════════════════════════════════════════════

async def register_fcm_token(db: AsyncSession, user: User, token: str, device_info: str = None) -> FCMToken:
    existing_result = await db.execute(select(FCMToken).where(FCMToken.token == token))
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.is_active = True
        existing.user_id = user.id
        if device_info:
            existing.device_info = device_info
        await db.flush()
        return existing

    fcm_token = FCMToken(user_id=user.id, token=token, device_info=device_info)
    db.add(fcm_token)
    await db.flush()
    return fcm_token


async def remove_fcm_token(db: AsyncSession, user: User, token: str) -> bool:
    result = await db.execute(
        select(FCMToken).where(FCMToken.token == token, FCMToken.user_id == user.id)
    )
    fcm_token = result.scalar_one_or_none()
    if not fcm_token:
        return False
    fcm_token.is_active = False
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  PREFERENCES
# ══════════════════════════════════════════════════════════════════════

async def _get_prefs(db: AsyncSession, user_id: UUID) -> NotificationPreference | None:
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_notification_prefs(db: AsyncSession, user: User) -> NotificationPreference:
    prefs = await _get_prefs(db, user.id)
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
        await db.flush()
    return prefs


async def update_notification_prefs(db: AsyncSession, user: User, data: dict) -> NotificationPreference:
    prefs = await get_notification_prefs(db, user)
    for key, value in data.items():
        if value is not None:
            setattr(prefs, key, value)
    await db.flush()
    return prefs
