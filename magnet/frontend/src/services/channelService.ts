import api from './api';

export const channelService = {
  create: (data: any) => api.post('/channels', data),
  list: (params?: { search?: string; page?: number; page_size?: number }) => api.get('/channels', { params }),
  getById: (id: string) => api.get(`/channels/${id}`),
  update: (id: string, data: any) => api.put(`/channels/${id}`, data),
  delete: (id: string) => api.delete(`/channels/${id}`),
  join: (id: string) => api.post(`/channels/${id}/join`),
  leave: (id: string) => api.post(`/channels/${id}/leave`),
  getMembers: (id: string) => api.get(`/channels/${id}/members`),
  addMember: (channelId: string, userId: string) => api.post(`/channels/${channelId}/members/${userId}`),
  removeMember: (channelId: string, userId: string) => api.delete(`/channels/${channelId}/members/${userId}`),
  getMessages: (id: string, params?: { page?: number; page_size?: number }) => api.get(`/channels/${id}/messages`, { params }),
  sendMessage: (id: string, data: { content?: string; image_url?: string }) => api.post(`/channels/${id}/messages`, data),
};
