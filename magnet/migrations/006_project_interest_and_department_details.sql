-- Project interest support and expanded notification types

CREATE TABLE IF NOT EXISTS project_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_interests_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_project_interests_project_id ON project_interests(project_id);
CREATE INDEX IF NOT EXISTS ix_project_interests_user_id ON project_interests(user_id);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type CHECK (
        type IN (
            'post', 'like', 'comment', 'mention', 'event', 'event_reminder',
            'approval', 'rejected', 'leaderboard', 'message', 'announcement',
            'channel_invite', 'system', 'project_invite', 'project_join',
            'task_assigned', 'task_completed', 'project_updated', 'project_interest'
        )
    );