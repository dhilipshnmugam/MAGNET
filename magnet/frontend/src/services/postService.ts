import api from './api';

export const postService = {
  create: (data: any) => api.post('/posts', data),
  getFeed: (params: { filter_type?: string; post_type?: string; page?: number; page_size?: number }) =>
    api.get('/posts', { params }),
  getById: (id: string) => api.get(`/posts/${id}`),
  update: (id: string, data: any) => api.put(`/posts/${id}`, data),
  delete: (id: string) => api.delete(`/posts/${id}`),
  toggleLike: (id: string) => api.post(`/posts/${id}/like`),
  toggleBookmark: (id: string) => api.post(`/posts/${id}/bookmark`),
  share: (id: string) => api.post(`/posts/${id}/share`),
  getAnalytics: (id: string) => api.get(`/posts/${id}/analytics`),
  getComments: (id: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/posts/${id}/comments`, { params }),
  addComment: (id: string, data: { content: string; parent_id?: string }) =>
    api.post(`/posts/${id}/comments`, data),
  deleteComment: (commentId: string) => api.delete(`/posts/comments/${commentId}`),
  getSavedPosts: (params?: { page?: number; page_size?: number }) =>
    api.get('/posts/saved', { params }),
  getTrendingTags: (limit?: number) =>
    api.get('/posts/trending', { params: { limit } }),
  getUserPosts: (userId: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/posts/user/${userId}`, { params }),
};
