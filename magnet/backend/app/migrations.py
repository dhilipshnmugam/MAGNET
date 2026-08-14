"""
Lightweight schema migration for the DM system.
Runs at startup after Base.metadata.create_all to add columns/backfill
data on pre-existing SQLite/PostgreSQL databases (create_all cannot alter
existing tables).
"""
import logging
from sqlalchemy import text

logger = logging.getLogger("magnet.migrations")

# Columns to add to direct_messages (with their SQL types)
DIRECT_MESSAGE_COLUMNS = {
    "conversation_id": "VARCHAR(36)",
    "message_type": "VARCHAR(30) NOT NULL DEFAULT 'text'",
    "reply_to_id": "VARCHAR(36)",
    "forwarded_from_id": "VARCHAR(36)",
    "is_forwarded": "BOOLEAN NOT NULL DEFAULT 0",
    "is_edited": "BOOLEAN NOT NULL DEFAULT 0",
    "is_starred": "BOOLEAN NOT NULL DEFAULT 0",
    "is_pinned": "BOOLEAN NOT NULL DEFAULT 0",
    "deleted_for": "TEXT",
    "edited_at": "TIMESTAMPTZ",
    "share_type": "VARCHAR(20)",
    "share_id": "VARCHAR(36)",
    "share_preview": "TEXT",
    "link_title": "VARCHAR(300)",
    "link_description": "TEXT",
    "link_image": "TEXT",
    "delivered_at": "TIMESTAMPTZ",
    "updated_at": "TIMESTAMPTZ",
}

USERS_COLUMNS = {
    "last_seen_at": "TIMESTAMPTZ",
}

EVENTS_COLUMNS = {
    "category": "VARCHAR(50) DEFAULT 'general'",
    "club_id": "VARCHAR(36)",
    "department_id": "VARCHAR(36)",
    "creator_role": "VARCHAR(30)",
    "organizer_name": "VARCHAR(255)",
    "registration_url": "TEXT",
    "contact_email": "VARCHAR(255)",
    "contact_phone": "VARCHAR(30)",
    "additional_info": "TEXT",
}

STORIES_COLUMNS = {
    "view_count": "INTEGER NOT NULL DEFAULT 0",
}

NOTIFICATION_TYPES_SQL = (
    "'post', 'like', 'comment', 'mention', 'event', 'event_reminder',"
    "'approval', 'rejected', 'leaderboard', 'message', 'announcement',"
    "'channel_invite', 'system',"
    "'project_invite', 'project_join', 'task_assigned', 'task_completed',"
    "'project_updated', 'project_interest', 'follow'"
)


async def _table_columns(conn, table: str, is_sqlite: bool) -> set[str]:
    if is_sqlite:
        result = await conn.execute(text(f"PRAGMA table_info({table})"))
        return {row[1] for row in result.all()}
    result = await conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = :t"
    ), {"t": table})
    return {row[0] for row in result.all()}


async def _ensure_columns(conn, table: str, columns: dict[str, str], is_sqlite: bool) -> int:
    existing = await _table_columns(conn, table, is_sqlite)
    added = 0
    for name, sql_type in columns.items():
        if name in existing:
            continue
        try:
            await conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {sql_type}'))
            added += 1
            logger.info(f"Added column {table}.{name}")
        except Exception as e:
            logger.warning(f"Could not add {table}.{name}: {e}")
    return added


async def _backfill_conversations(conn, is_sqlite: bool) -> int:
    """Create conversations for legacy direct messages that have no conversation_id."""
    if is_sqlite:
        pairs_q = text("""
            SELECT DISTINCT
                CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END AS u1,
                CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END AS u2
            FROM direct_messages
            WHERE conversation_id IS NULL
        """)
    else:
        pairs_q = text("""
            SELECT DISTINCT LEAST(sender_id, receiver_id) AS u1, GREATEST(sender_id, receiver_id) AS u2
            FROM direct_messages
            WHERE conversation_id IS NULL
        """)
    pairs = (await conn.execute(pairs_q)).all()

    created = 0
    for u1, u2 in pairs:
        if not u1 or not u2:
            continue
        conv_id = uuid4_hex()
        await conn.execute(text(
            "INSERT INTO conversations (id, created_at, updated_at) VALUES (:id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ), {"id": conv_id})
        await conn.execute(text(
            "INSERT INTO conversation_participants (id, conversation_id, user_id, last_read_at, is_pinned, is_archived, is_muted, created_at) "
            "VALUES (:pid, :cid, :uid, CURRENT_TIMESTAMP, 0, 0, 0, CURRENT_TIMESTAMP)"
        ), {"pid": uuid4_hex(), "cid": conv_id, "uid": u1})
        await conn.execute(text(
            "INSERT INTO conversation_participants (id, conversation_id, user_id, last_read_at, is_pinned, is_archived, is_muted, created_at) "
            "VALUES (:pid, :cid, :uid, CURRENT_TIMESTAMP, 0, 0, 0, CURRENT_TIMESTAMP)"
        ), {"pid": uuid4_hex(), "cid": conv_id, "uid": u2})
        await conn.execute(text(
            "UPDATE direct_messages SET conversation_id = :cid "
            "WHERE conversation_id IS NULL AND "
            "((sender_id = :u1 AND receiver_id = :u2) OR (sender_id = :u2 AND receiver_id = :u1))"
        ), {"cid": conv_id, "u1": u1, "u2": u2})
        created += 1
    return created


def uuid4_hex() -> str:
    import uuid
    return str(uuid.uuid4())


async def _rebuild_notifications_check(conn, is_sqlite: bool) -> int:
    """Expand chk_notifications_type to include project notification types.

    SQLite cannot ALTER a CHECK constraint, so the table must be rebuilt.
    Postgres uses the migrations/*.sql ALTER for the same purpose; the SQLite
    path is handled here so the constraint matches app.models.notification.
    """
    if not is_sqlite:
        try:
            await conn.execute(text(
                "ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type"
            ))
            await conn.execute(text(
                "ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type "
                f"CHECK (type IN ({NOTIFICATION_TYPES_SQL}))"
            ))
        except Exception as e:
            logger.warning(f"Could not update notifications constraint (Postgres): {e}")
        return 0

    result = await conn.execute(text(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications'"
    ))
    row = result.one_or_none()
    if row is None:
        return 0
    table_sql = row[0] or ""
    if "project_interest" in table_sql and "follow" in table_sql:
        return 0

    await conn.execute(text("""
        CREATE TABLE notifications_new (
            id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            sender_id VARCHAR(36),
            type VARCHAR(30) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            ref_type VARCHAR(30),
            ref_id VARCHAR(36),
            sender_name VARCHAR(255),
            sender_avatar TEXT,
            is_read BOOLEAN NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT chk_notifications_type CHECK (type IN (""" + NOTIFICATION_TYPES_SQL + """)),
            FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY(sender_id) REFERENCES users (id) ON DELETE SET NULL
        )
    """))
    await conn.execute(text("""
        INSERT INTO notifications_new
            (id, user_id, sender_id, type, title, body, ref_type, ref_id,
             sender_name, sender_avatar, is_read, created_at)
        SELECT id, user_id, sender_id, type, title, body, ref_type, ref_id,
               sender_name, sender_avatar, is_read, created_at
        FROM notifications
    """))
    await conn.execute(text("DROP TABLE notifications"))
    await conn.execute(text("ALTER TABLE notifications_new RENAME TO notifications"))
    await conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_unread ON notifications (user_id, is_read)"
    ))
    await conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_created ON notifications (user_id, created_at)"
    ))
    logger.info("Rebuilt notifications table with expanded type constraint")
    return 1


async def _rebuild_user_follows_unique(conn, is_sqlite: bool) -> int:
    """Add a UNIQUE (follower_id, following_id) constraint to user_follows.

    SQLite cannot ALTER a table to add a constraint, so the table must be
    rebuilt (deduplicating any existing duplicate rows first). Postgres is
    handled by migrations/*.sql.
    """
    if not is_sqlite:
        return 0

    idx = await conn.execute(text(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'uq_user_follows_pair'"
    ))
    if idx.one_or_none():
        return 0

    result = await conn.execute(text(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'user_follows'"
    ))
    if result.one_or_none() is None:
        return 0

    await conn.execute(text("""
        CREATE TABLE user_follows_new (
            id VARCHAR(36) NOT NULL,
            follower_id VARCHAR(36) NOT NULL,
            following_id VARCHAR(36) NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_user_follows_pair UNIQUE (follower_id, following_id),
            CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id),
            FOREIGN KEY(follower_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY(following_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """))
    await conn.execute(text("""
        INSERT INTO user_follows_new (id, follower_id, following_id, created_at)
        SELECT id, follower_id, following_id, created_at
        FROM user_follows
        GROUP BY follower_id, following_id
    """))
    await conn.execute(text("DROP TABLE user_follows"))
    await conn.execute(text("ALTER TABLE user_follows_new RENAME TO user_follows"))
    await conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_user_follows_follower_id ON user_follows (follower_id)"
    ))
    await conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_user_follows_following_id ON user_follows (following_id)"
    ))
    logger.info("Rebuilt user_follows table with unique (follower_id, following_id) constraint")
    return 1


async def run_migrations(conn) -> int:
    """Run all pending migrations. `conn` is a sync connection for SQLite PRAGMA,
    so we detect dialect from bind and execute async DDL via conn (AsyncConnection)."""
    from sqlalchemy.dialects import sqlite
    is_sqlite = conn.dialect.name == "sqlite" or isinstance(conn.dialect, sqlite.dialect)

    changes = 0
    changes += await _ensure_columns(conn, "direct_messages", DIRECT_MESSAGE_COLUMNS, is_sqlite)
    changes += await _ensure_columns(conn, "users", USERS_COLUMNS, is_sqlite)
    changes += await _ensure_columns(conn, "events", EVENTS_COLUMNS, is_sqlite)
    changes += await _ensure_columns(conn, "stories", STORIES_COLUMNS, is_sqlite)
    changes += await _backfill_conversations(conn, is_sqlite)
    changes += await _rebuild_notifications_check(conn, is_sqlite)
    changes += await _rebuild_user_follows_unique(conn, is_sqlite)
    return changes
