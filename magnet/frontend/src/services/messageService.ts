import api from './api';

export const messageService = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId: string, params?: { page?: number; page_size?: number }) => api.get(`/messages/conversations/${userId}`, { params }),
  send: (data: { receiver_id: string; content?: string; image_url?: string }) => api.post('/messages', data),
  markRead: (id: string) => api.put(`/messages/${id}/read`),
  delete: (id: string) => api.delete(`/messages/${id}`),
};
