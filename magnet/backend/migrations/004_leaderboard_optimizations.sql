-- ═══════════════════════════════════════════════════════════════
--  Migration: Add period_snapshots table + optimize indexes
--  Run this against the PostgreSQL database
-- ═══════════════════════════════════════════════════════════════

-- 1. New table: period_snapshots
CREATE TABLE IF NOT EXISTS period_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(10) NOT NULL,
    entity_type VARCHAR(15) NOT NULL,
    entity_id UUID NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    metadata_json VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_snapshot_period CHECK (period_type IN ('weekly', 'monthly', 'yearly')),
    CONSTRAINT chk_snapshot_entity CHECK (entity_type IN ('user', 'club', 'department')),
    CONSTRAINT uq_snapshot UNIQUE (period_type, entity_type, entity_id, period_start)
);

-- 2. Indexes for period_snapshots
CREATE INDEX IF NOT EXISTS ix_snapshot_period ON period_snapshots (period_type, period_start);
CREATE INDEX IF NOT EXISTS ix_snapshot_entity ON period_snapshots (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_snapshot_rank ON period_snapshots (period_type, entity_type, points_earned);

-- 3. Optimize existing indexes
-- Points table: composite index for time-filtered aggregations
CREATE INDEX IF NOT EXISTS ix_points_created ON points (created_at);
CREATE INDEX IF NOT EXISTS ix_points_activity_type ON points (activity_type);
CREATE INDEX IF NOT EXISTS ix_points_user_activity ON points (user_id, activity_type, created_at);

-- Leaderboard: index for sorting
CREATE INDEX IF NOT EXISTS ix_leaderboard_points_desc ON leaderboard (total_points DESC);

-- Club rankings: index for sorting
CREATE INDEX IF NOT EXISTS ix_club_rankings_points ON club_rankings (total_points DESC);

-- Department rankings: index for sorting
CREATE INDEX IF NOT EXISTS ix_dept_rankings_points ON department_rankings (total_points DESC);

-- 4. Partial indexes for common filtered queries
-- Active student users
CREATE INDEX IF NOT EXISTS ix_users_active_student ON users (id, department_id)
    WHERE role = 'student' AND is_active = true;

-- Points in current month (for monthly ranking)
CREATE INDEX IF NOT EXISTS ix_points_current_month ON points (user_id, points_value, created_at)
    WHERE created_at >= DATE_TRUNC('month', NOW());

-- Points in current week (for weekly ranking)
CREATE INDEX IF NOT EXISTS ix_points_current_week ON points (user_id, points_value, created_at)
    WHERE created_at >= DATE_TRUNC('week', NOW());

-- 5. Materialized view for fast student rankings
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_student_rankings AS
SELECT
    p.user_id,
    u.full_name,
    u.avatar_url,
    u.department_id,
    COALESCE(SUM(p.points_value), 0) AS total_points,
    COUNT(p.id) AS total_activities,
    MAX(p.created_at) AS last_active,
    RANK() OVER (ORDER BY SUM(p.points_value) DESC) AS rank
FROM points p
JOIN users u ON p.user_id = u.id
WHERE u.is_active = true AND u.role = 'student'
GROUP BY p.user_id, u.full_name, u.avatar_url, u.department_id;

CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_student_user ON mv_student_rankings (user_id);
CREATE INDEX IF NOT EXISTS ix_mv_student_rank ON mv_student_rankings (rank);
CREATE INDEX IF NOT EXISTS ix_mv_student_dept ON mv_student_rankings (department_id);

-- 6. Materialized view for monthly student rankings
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_student_rankings AS
SELECT
    p.user_id,
    u.full_name,
    u.avatar_url,
    u.department_id,
    COALESCE(SUM(p.points_value), 0) AS points_earned,
    COUNT(p.id) AS activity_count,
    RANK() OVER (ORDER BY SUM(p.points_value) DESC) AS rank
FROM points p
JOIN users u ON p.user_id = u.id
WHERE u.is_active = true
  AND u.role = 'student'
  AND p.created_at >= DATE_TRUNC('month', NOW())
GROUP BY p.user_id, u.full_name, u.avatar_url, u.department_id;

CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_monthly_user ON mv_monthly_student_rankings (user_id);
CREATE INDEX IF NOT EXISTS ix_mv_monthly_rank ON mv_monthly_student_rankings (rank);

-- 7. Materialized view for monthly club rankings
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_club_rankings AS
SELECT
    cm.club_id,
    COALESCE(SUM(p.points_value), 0) AS points_earned,
    COUNT(DISTINCT p.user_id) AS active_members,
    COUNT(p.id) AS activity_count,
    RANK() OVER (ORDER BY SUM(p.points_value) DESC) AS rank
FROM club_members cm
JOIN points p ON p.user_id = cm.user_id
JOIN clubs c ON cm.club_id = c.id
WHERE c.is_active = true
  AND p.created_at >= DATE_TRUNC('month', NOW())
GROUP BY cm.club_id;

CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_monthly_club ON mv_monthly_club_rankings (club_id);
CREATE INDEX IF NOT EXISTS ix_mv_monthly_club_rank ON mv_monthly_club_rankings (rank);

-- 8. Refresh function (call from cron or admin endpoint)
CREATE OR REPLACE FUNCTION refresh_ranking_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_rankings;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_student_rankings;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_club_rankings;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to refresh views on schedule (pg_cron compatible)
-- SELECT cron.schedule('refresh-rankings', '*/30 * * * *', 'SELECT refresh_ranking_views()');
