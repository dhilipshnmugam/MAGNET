import api from './api';

export interface GrowthData {
  month: string;
  count: number;
}

export interface DeptPerformance {
  department_id: string;
  department_name: string;
  department_code: string;
  total_users: number;
  student_count: number;
  faculty_count: number;
  active_users: number;
  post_count: number;
  event_count: number;
  club_count: number;
  total_points: number;
  rank: number;
}

export interface ClubPerformance {
  club_id: string;
  club_name: string;
  member_count: number;
  post_count: number;
  active_members: number;
  total_points: number;
  rank: number;
}

export interface ActivityDay {
  day: string;
  posts: number;
  comments: number;
  likes: number;
  events: number;
  club_activities: number;
  total: number;
}

export interface EventParticipation {
  month: string;
  events_created: number;
  rsvps_going: number;
  rsvps_interested: number;
}

export interface MonthlyStats {
  current_month: Record<string, number>;
  previous_month: Record<string, number>;
  growth: Record<string, number>;
}

export interface HodDashboard {
  department: {
    students: number;
    faculty_count: number;
    posts: number;
    events: number;
    clubs: number;
    total_points: number;
  };
  top_students: Array<{
    user_id: string;
    name: string;
    avatar: string | null;
    points: number;
    rank: number;
  }>;
  activity_trend: Array<{
    day: string;
    activities: number;
    points: number;
  }>;
}

export interface HodSelfDashboard {
  channels: Array<{
    id: string;
    name: string;
    member_count: number;
    type: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    event_date: string;
    rsvp_count: number;
    event_type: string;
  }>;
  engagement: {
    my_posts: number;
    total_likes: number;
    total_comments: number;
  };
  monthly_posts: Array<{
    month: string;
    posts: number;
  }>;
}

export interface PrincipalDashboard {
  overview: {
    total_users: number;
    total_students: number;
    total_faculty: number;
    total_admins: number;
    total_posts: number;
    total_events: number;
    total_channels: number;
    total_clubs: number;
    total_departments: number;
  };
  department_performance: Array<{
    name: string;
    code: string;
    students: number;
    posts: number;
    points: number;
  }>;
}

export interface PrincipalDepartmentDetails {
  department: {
    id: string;
    name: string;
    code: string;
    department_type: string | null;
    description: string | null;
    head_name: string | null;
    head_email: string | null;
    total_users: number;
    students: number;
    faculty_count: number;
    active_users: number;
    posts: number;
    events: number;
    clubs: number;
    total_points: number;
  };
  top_students: Array<{
    user_id: string;
    name: string;
    avatar: string | null;
    register_number: string | null;
    year: string | null;
    points: number;
    rank: number;
  }>;
  activity_trend: Array<{
    day: string;
    activities: number;
    points: number;
  }>;
  posts_over_time: Array<{
    month: string;
    posts: number;
  }>;
}

export interface PrincipalUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  role: string;
  is_active: boolean;
  department_id: string | null;
  department_name: string | null;
  year: string | null;
  register_number: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  points: number;
  post_count: number;
}

export interface PrincipalPost {
  id: string;
  content: string;
  title: string | null;
  post_type: string;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string | null;
  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  club_name: string | null;
  department_name: string | null;
}

export const analyticsService = {
  getStudentGrowth: (months?: number) =>
    api.get('/analytics/student-growth', { params: { months } }),

  getActivityGraph: (days?: number) =>
    api.get('/analytics/activity-graph', { params: { days } }),

  getEventParticipation: (months?: number) =>
    api.get('/analytics/event-participation', { params: { months } }),

  getMonthlyStatistics: () =>
    api.get('/analytics/monthly-statistics'),

  getDepartmentPerformance: () =>
    api.get('/analytics/department-performance'),

  getClubPerformance: (department_id?: string) =>
    api.get('/analytics/club-performance', { params: { department_id } }),

  getHodDashboard: (department_id: string) =>
    api.get('/analytics/hod-dashboard', { params: { department_id } }),

  getHodSelfDashboard: () =>
    api.get('/analytics/hod-self-dashboard'),

  getPrincipalDashboard: () =>
    api.get('/analytics/principal-dashboard'),

  getPrincipalDepartmentDetails: (department_id: string) =>
    api.get('/analytics/principal-department', { params: { department_id } }),

  getPrincipalUsers: (role: string, params: { search?: string; page?: number; page_size?: number } = {}) =>
    api.get('/analytics/principal/users', { params: { role, ...params } }),

  getPrincipalPosts: (params: { search?: string; page?: number; page_size?: number } = {}) =>
    api.get('/analytics/principal/posts', { params }),
};
