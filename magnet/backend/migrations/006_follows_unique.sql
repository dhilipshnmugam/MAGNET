-- Migration 006: Followers / Following system hardening
-- Adds a unique (follower_id, following_id) constraint and the 'follow' notification type.

BEGIN;

-- Deduplicate any accidental duplicate follow rows before adding the constraint
DELETE FROM user_follows a USING user_follows b
WHERE a.follower_id = b.follower_id
  AND a.following_id = b.following_id
  AND a.created_at > b.created_at;

ALTER TABLE user_follows
    DROP CONSTRAINT IF EXISTS uq_user_follows_pair;

ALTER TABLE user_follows
    ADD CONSTRAINT uq_user_follows_pair UNIQUE (follower_id, following_id);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (
    type IN (
        'post', 'like', 'comment', 'mention', 'event', 'event_reminder',
        'approval', 'rejected', 'leaderboard', 'message', 'announcement',
        'channel_invite', 'system',
        'project_invite', 'project_join', 'task_assigned', 'task_completed',
        'project_updated', 'project_interest', 'follow'
    )
);

COMMIT;
