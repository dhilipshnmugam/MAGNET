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


async def run_migrations(conn) -> int:
    """Run all pending migrations. `conn` is a sync connection for SQLite PRAGMA,
    so we detect dialect from bind and execute async DDL via conn (AsyncConnection)."""
    from sqlalchemy.dialects import sqlite
    is_sqlite = conn.dialect.name == "sqlite" or isinstance(conn.dialect, sqlite.dialect)

    changes = 0
    changes += await _ensure_columns(conn, "direct_messages", DIRECT_MESSAGE_COLUMNS, is_sqlite)
    changes += await _ensure_columns(conn, "users", USERS_COLUMNS, is_sqlite)
    changes += await _backfill_conversations(conn, is_sqlite)
    return changes
