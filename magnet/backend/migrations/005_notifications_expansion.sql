-- Migration 005: Notification System Expansion
-- Adds sender_id, sender_name, sender_avatar, new notification types, and indexes.

BEGIN;

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS sender_avatar TEXT;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (
    type IN (
        'post', 'like', 'comment', 'mention', 'event', 'event_reminder',
        'approval', 'rejected', 'leaderboard', 'message', 'announcement',
        'channel_invite', 'system'
    )
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_unread
    ON notifications (user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS ix_notifications_user_created
    ON notifications (user_id, created_at DESC);

-- Notification preferences: replace old columns with new full set
ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS post_notifs BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS mention_notifs BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS approval_notifs BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS leaderboard_notifs BOOLEAN NOT NULL DEFAULT true;

-- Migrate old column values to new columns where they exist
UPDATE notification_preferences SET post_notifs = true WHERE post_notifs IS NULL;
UPDATE notification_preferences SET mention_notifs = true WHERE mention_notifs IS NULL;
UPDATE notification_preferences SET approval_notifs = true WHERE approval_notifs IS NULL;
UPDATE notification_preferences SET leaderboard_notifs = true WHERE leaderboard_notifs IS NULL;

COMMIT;
