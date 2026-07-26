import asyncio
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

for line in (Path(__file__).parent / ".env").read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

DATABASE_URL = os.environ.get("DATABASE_URL")

MIGRATION_SQL = [
    # Add new columns to posts table
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS title VARCHAR(300)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(30) NOT NULL DEFAULT 'general'",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS mention_ids TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS bookmark_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS achievement_type VARCHAR(50)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS achievement_score INTEGER",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS certificate_url TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_name VARCHAR(200)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMPTZ",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_time VARCHAR(50)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_location VARCHAR(255)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS registration_url TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS participant_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_url TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_size INTEGER",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS collaboration_type VARCHAR(50)",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS required_skills TEXT",
    "ALTER TABLE posts ADD COLUMN IF NOT EXISTS team_size INTEGER",

    # Drop old FK constraint on visibility, recreate with new values
    "ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_posts_visibility",
    "ALTER TABLE posts ADD CONSTRAINT chk_posts_visibility CHECK (visibility IN ('public', 'department', 'club_members', 'private'))",

    # Add post_type check constraint
    "ALTER TABLE posts ADD CONSTRAINT chk_posts_type CHECK (post_type IN ('general', 'achievement', 'event', 'club_announcement', 'academic_resource', 'internship', 'placement', 'collaboration'))",

    # Create post_media table
    """CREATE TABLE IF NOT EXISTS post_media (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        media_type VARCHAR(20) NOT NULL DEFAULT 'image',
        cloudinary_id VARCHAR(255),
        thumbnail_url TEXT,
        sort_order SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_post_media_order CHECK (sort_order >= 0 AND sort_order <= 9),
        CONSTRAINT chk_post_media_type CHECK (media_type IN ('image', 'video', 'document'))
    )""",
    "CREATE INDEX IF NOT EXISTS ix_post_media_post_id ON post_media(post_id)",

    # Create bookmarks table
    """CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_bookmarks_post_user UNIQUE (post_id, user_id)
    )""",
    "CREATE INDEX IF NOT EXISTS ix_bookmarks_post_id ON bookmarks(post_id)",
    "CREATE INDEX IF NOT EXISTS ix_bookmarks_user_id ON bookmarks(user_id)",

    # Create post_shares table
    """CREATE TABLE IF NOT EXISTS post_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_shares_post_user UNIQUE (post_id, user_id)
    )""",
    "CREATE INDEX IF NOT EXISTS ix_post_shares_post_id ON post_shares(post_id)",

    # Create hashtags table
    """CREATE TABLE IF NOT EXISTS hashtags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tag VARCHAR(100) NOT NULL UNIQUE,
        post_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    "CREATE INDEX IF NOT EXISTS ix_hashtags_tag ON hashtags(tag)",

    # Create post_hashtags table
    """CREATE TABLE IF NOT EXISTS post_hashtags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
        CONSTRAINT uq_post_hashtag UNIQUE (post_id, hashtag_id)
    )""",
    "CREATE INDEX IF NOT EXISTS ix_post_hashtags_post_id ON post_hashtags(post_id)",
    "CREATE INDEX IF NOT EXISTS ix_post_hashtags_hashtag_id ON post_hashtags(hashtag_id)",
]


async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        for i, sql in enumerate(MIGRATION_SQL):
            try:
                await conn.execute(text(sql))
                print(f"  [{i+1}/{len(MIGRATION_SQL)}] OK: {sql[:80]}...")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    print(f"  [{i+1}/{len(MIGRATION_SQL)}] SKIP (exists): {sql[:60]}...")
                else:
                    print(f"  [{i+1}/{len(MIGRATION_SQL)}] ERROR: {e}")
                    print(f"    SQL: {sql[:120]}...")
    await engine.dispose()
    print("\nMigration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
