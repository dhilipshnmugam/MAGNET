import api from './api';

export { default as api, getApiError } from './api';
export { authService } from './authService';
export { postService } from './postService';
export { messageService } from './messageService';
export { channelService } from './channelService';
export { leaderboardService } from './leaderboardService';

export const announcementService = {
  create: (data: any) => api.post('/announcements', data),
  list: (params?: { page?: number; page_size?: number }) => api.get('/announcements', { params }),
  getById: (id: string) => api.get(`/announcements/${id}`),
  delete: (id: string) => api.delete(`/announcements/${id}`),
};

export const eventService = {
  create: (data: any) => api.post('/events', data),
  list: (params?: {
    search?: string;
    event_type?: string;
    category?: string;
    scope?: string;
    organizer_type?: string;
    department_id?: string;
    page?: number;
    page_size?: number;
  }) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  rsvp: (id: string, data: { status: string }) => api.post(`/events/${id}/rsvp`, data),
  getRsvps: (id: string) => api.get(`/events/${id}/rsvps`),
};

export const notificationService = {
  list: (params?: { page?: number; page_size?: number; unread_only?: boolean; type?: string }) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  registerFcm: (token: string) => api.post('/notifications/fcm-token', { token }),
  removeFcm: (token: string) => api.delete('/notifications/fcm-token', { data: { token } }),
  getPrefs: () => api.get('/notifications/preferences'),
  updatePrefs: (data: any) => api.put('/notifications/preferences', data),
};

export const searchService = {
  search: (q: string, filter_type?: string, page?: number, limit?: number) =>
    api.get('/search', { params: { q, filter_type: filter_type || 'all', page: page || 1, limit: limit || 5 } }),
  suggestions: (q: string, limit?: number) =>
    api.get('/search/suggestions', { params: { q, limit: limit || 5 } }),
};

export const uploadService = {
  image: (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    return api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const storyService = {
  create: (data: { media_url: string; media_type: string; content?: string; thumbnail_url?: string }) =>
    api.post('/stories', data),
  getActiveStories: () => api.get('/stories'),
  getById: (id: string) => api.get(`/stories/${id}`),
  like: (id: string) => api.post(`/stories/${id}/like`),
  unlike: (id: string) => api.delete(`/stories/${id}/like`),
  addComment: (id: string, data: { content: string }) => api.post(`/stories/${id}/comments`, data),
  getComments: (id: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/stories/${id}/comments`, { params }),
  view: (id: string) => api.post(`/stories/${id}/view`),
  getViewers: (id: string) => api.get(`/stories/${id}/viewers`),
  getLikers: (id: string) => api.get(`/stories/${id}/likes`),
  delete: (id: string) => api.delete(`/stories/${id}`),
};

export const adminService = {
  dashboard: () => api.get('/admin/dashboard'),
  listUsers: (params?: any) => api.get('/admin/users', { params }),
  changeRole: (userId: string, role: string) => api.put(`/admin/users/${userId}/role`, { role }),
  changeStatus: (userId: string, isActive: boolean) => api.put(`/admin/users/${userId}/status`, { is_active: isActive }),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  listChannels: (params?: any) => api.get('/admin/channels', { params }),
  listApprovals: (params?: any) => api.get('/admin/approvals', { params }),
  reviewApproval: (requestId: string, data: { status: string; review_note?: string }) =>
    api.put(`/admin/approvals/${requestId}`, data),
};

export const departmentService = {
  list: (params?: { search?: string; status?: string; page?: number; page_size?: number }) =>
    api.get('/departments', { params }),
  getById: (id: string) => api.get(`/departments/${id}`),
  create: (data: any) => api.post('/departments', data),
  update: (id: string, data: any) => api.put(`/departments/${id}`, data),
  toggleStatus: (id: string) => api.put(`/departments/${id}/status`),
  delete: (id: string) => api.delete(`/departments/${id}`),
  getStats: () => api.get('/departments/stats/overview'),
  getUsers: (id: string, params?: { role?: string; search?: string; active?: boolean; page?: number; page_size?: number }) =>
    api.get(`/departments/${id}/users`, { params }),
  getPosts: (id: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/departments/${id}/posts`, { params }),
};

export const clubManagementService = {
  list: (params?: { search?: string; category?: string; domain?: string; club_type?: string; department_id?: string; status?: string; page?: number; page_size?: number }) =>
    api.get('/clubs/', { params }),
  getById: (id: string) => api.get(`/clubs/${id}`),
  create: (data: any) => api.post('/clubs/', data),
  update: (id: string, data: any) => api.put(`/clubs/${id}`, data),
  toggleStatus: (id: string) => api.put(`/clubs/${id}/status`),
  delete: (id: string) => api.delete(`/clubs/${id}`),
  assignAdmin: (id: string, userId: string) => api.post(`/clubs/${id}/assign-admin`, { user_id: userId }),
  removeAdmin: (id: string) => api.delete(`/clubs/${id}/remove-admin`),
  getStats: () => api.get('/clubs/stats/overview'),
  join: (id: string, message?: string) => api.post(`/clubs/${id}/join`, { message }),
  leave: (id: string) => api.post(`/clubs/${id}/leave`),
  getMembership: (id: string) => api.get(`/clubs/${id}/membership`),
  getMyClubs: () => api.get('/clubs/my-clubs'),
  getJoinRequests: (id: string, params?: { status?: string; page?: number; page_size?: number }) =>
    api.get(`/clubs/${id}/join-requests`, { params }),
  reviewJoinRequest: (requestId: string, status: string) =>
    api.put(`/clubs/join-requests/${requestId}`, { status }),
  getMembers: (id: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/clubs/${id}/members`, { params }),
  removeMember: (clubId: string, userId: string) => api.delete(`/clubs/${clubId}/members/${userId}`),
  getDashboard: (id: string) => api.get(`/clubs/${id}/dashboard`),
  getDepartmentClubs: (deptId: string) => api.get(`/clubs/department/${deptId}`),
  getEvents: (clubId: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/clubs/${clubId}/events`, { params }),
  getClubPosts: (clubId: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/clubs/${clubId}/posts`, { params }),
  createEvent: (clubId: string, data: any) => api.post(`/clubs/${clubId}/events`, data),
  deleteEvent: (clubId: string, eventId: string) => api.delete(`/clubs/${clubId}/events/${eventId}`),
  getGallery: (clubId: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/clubs/${clubId}/gallery`, { params }),
  addGallery: (clubId: string, data: any) => api.post(`/clubs/${clubId}/gallery`, data),
  deleteGallery: (clubId: string, itemId: string) => api.delete(`/clubs/${clubId}/gallery/${itemId}`),
  getAchievements: (clubId: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/clubs/${clubId}/achievements`, { params }),
  createAchievement: (clubId: string, data: any) => api.post(`/clubs/${clubId}/achievements`, data),
  deleteAchievement: (clubId: string, achId: string) => api.delete(`/clubs/${clubId}/achievements/${achId}`),
};

export const analyticsService = {
  overview: () => api.get('/analytics/overview'),
  postAnalytics: () => api.get('/analytics/posts'),
  heatmap: (year?: number) => api.get('/analytics/heatmap', { params: { year } }),
  logActivity: (data: { type?: string; count?: number; hours?: number }) => api.post('/analytics/activity/log', data),
  trends: (period?: string) => api.get('/analytics/trends', { params: { period } }),
};

export const projectService = {
  list: (params?: { category?: string; status?: string; search?: string; page?: number; per_page?: number }) =>
    api.get('/projects/', { params }),
  myProjects: () => api.get('/projects/my'),
  getById: (id: string) => api.get(`/projects/${id}`),
  expressInterest: (id: string) => api.post(`/projects/${id}/interest`),
  create: (data: any) => api.post('/projects/', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  invite: (id: string, userId: string) => api.post(`/projects/${id}/invite`, { user_id: userId }),
  join: (id: string) => api.post(`/projects/${id}/join`),
  respondInvitation: (invitationId: string, action: string) =>
    api.post(`/projects/invitations/${invitationId}/respond`, { action }),
  updateMemberRole: (projectId: string, memberId: string, role: string) =>
    api.put(`/projects/${projectId}/members/${memberId}`, { role }),
  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/projects/${projectId}/members/${memberId}`),
  createTask: (projectId: string, data: any) => api.post(`/projects/${projectId}/tasks`, data),
  updateTask: (projectId: string, taskId: string, data: any) =>
    api.put(`/projects/${projectId}/tasks/${taskId}`, data),
  deleteTask: (projectId: string, taskId: string) =>
    api.delete(`/projects/${projectId}/tasks/${taskId}`),
};

export const clubRoleService = {
  listRoles: (clubId: string) => api.get(`/clubs/${clubId}/roles`),
  addRole: (clubId: string, memberId: string, role: string) =>
    api.post(`/clubs/${clubId}/members/${memberId}/roles`, { role }),
  removeRole: (clubId: string, memberId: string, roleId: string) =>
    api.delete(`/clubs/${clubId}/members/${memberId}/roles/${roleId}`),
  listAssignments: (clubId: string) => api.get(`/clubs/${clubId}/assignments`),
  createAssignment: (clubId: string, data: any) => api.post(`/clubs/${clubId}/assignments`, data),
  updateAssignment: (clubId: string, assignmentId: string, data: any) =>
    api.put(`/clubs/${clubId}/assignments/${assignmentId}`, data),
};

export const userService = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.put('/users/me', data),
  updateStudent: (data: any) => api.put('/users/me/student', data),
  updateHod: (data: any) => api.put('/users/me/hod', data),
  list: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  getProfile: (id: string) => api.get(`/users/${id}/profile`),
  follow: (id: string) => api.post(`/users/${id}/follow`),
  unfollow: (id: string) => api.delete(`/users/${id}/follow`),
  getFollowers: (id: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/users/${id}/followers`, { params }),
  getFollowing: (id: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/users/${id}/following`, { params }),
};
