import api from './api';

// ─── Types ─────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  user_id?: string;
  user_name?: string;
  user_avatar?: string | null;
  total_points: number;
  streak_days?: number;
  total_activities?: number;
  last_active?: string | null;
}

export interface ClubRankingEntry {
  rank: number;
  club_id: string;
  club_name: string | null;
  club_icon: string | null;
  total_points: number;
  total_posts?: number;
  active_members?: number;
  member_count?: number;
}

export interface DepartmentRankingEntry {
  rank: number;
  department_id: string;
  department_name: string | null;
  department_code: string | null;
  total_points: number;
  student_count?: number;
  active_users?: number;
  club_count?: number;
  post_count?: number;
}

export interface PeriodRankingEntry {
  rank: number;
  entity_id: string;
  name: string;
  icon: string | null;
  points_earned: number;
  activity_count: number;
}

export interface MyRanking {
  overall_rank: number;
  student_rank: number;
  total_points: number;
  all_time_points: number;
  streak_days: number;
  weekly_points: number;
  monthly_points: number;
  yearly_points: number;
  recent_activity: PointActivity[];
}

export interface PointActivity {
  activity_type: string;
  points_value: number;
  description: string | null;
  created_at: string;
}

export interface LeaderboardStats {
  total_users: number;
  total_points_awarded: number;
  total_activities: number;
  top_user: { user_id: string | null; user_name: string | null; total_points: number };
  today: { active_users: number; points_earned: number };
  this_week: { active_users: number; points_earned: number };
  this_month: { active_users: number; points_earned: number };
}

export type EntityType = 'user' | 'club' | 'department';
export type PeriodType = 'weekly' | 'monthly' | 'yearly';

// ─── Service ───────────────────────────────────

export const leaderboardService = {
  // Top N
  getTopStudents: (limit?: number, department_id?: string) =>
    api.get('/leaderboard/top/students', { params: { limit, department_id } }),

  getTopClubs: (limit?: number, department_id?: string) =>
    api.get('/leaderboard/top/clubs', { params: { limit, department_id } }),

  getTopDepartments: (limit?: number) =>
    api.get('/leaderboard/top/departments', { params: { limit } }),

  // Time-based
  getWeekly: (entity_type: EntityType = 'user', limit?: number, department_id?: string) =>
    api.get('/leaderboard/weekly', { params: { entity_type, limit, department_id } }),

  getMonthly: (entity_type: EntityType = 'user', limit?: number, department_id?: string) =>
    api.get('/leaderboard/monthly', { params: { entity_type, limit, department_id } }),

  getYearly: (entity_type: EntityType = 'user', limit?: number, department_id?: string) =>
    api.get('/leaderboard/yearly', { params: { entity_type, limit, department_id } }),

  // Overall
  getOverall: (entity_type: EntityType = 'user', limit?: number, department_id?: string) =>
    api.get('/leaderboard/overall', { params: { entity_type, limit, department_id } }),

  // My ranking
  getMyRanking: () =>
    api.get('/leaderboard/me'),

  // Points history
  getPointsHistory: (page?: number, page_size?: number) =>
    api.get('/leaderboard/points/history', { params: { page, page_size } }),

  // Stats
  getStats: () =>
    api.get('/leaderboard/stats'),

  // Admin
  computeSnapshots: (period_type: PeriodType) =>
    api.post(`/leaderboard/snapshots/${period_type}`),

  recalculate: () =>
    api.post('/leaderboard/recalculate'),
};
