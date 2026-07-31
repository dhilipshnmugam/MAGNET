import api from './api';
import { Message, MessageType, UserSearchResult } from '../types';

export interface SendMessagePayload {
  receiver_id: string;
  content?: string;
  image_url?: string;
  message_type?: MessageType;
  reply_to_id?: string;
  forwarded_from_id?: string;
  is_forwarded?: boolean;
  share_type?: string;
  share_id?: string;
  share_preview?: any;
  attachments?: Array<{
    file_type: string;
    file_url: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
    width?: number;
    height?: number;
  }>;
}

export const messageService = {
  getConversations: (params?: { search?: string; filter?: 'pinned' | 'archived' | 'unread' }) =>
    api.get('/messages/conversations', { params }),
  getMessages: (userId: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/messages/conversations/${userId}`, { params }),
  createConversation: (userId: string) => api.post('/messages/conversations', { user_id: userId }),
  markConversationRead: (conversationId: string) =>
    api.put(`/messages/conversations/${conversationId}/read`),
  pinConversation: (conversationId: string) =>
    api.post(`/messages/conversations/${conversationId}/pin`),
  archiveConversation: (conversationId: string) =>
    api.post(`/messages/conversations/${conversationId}/archive`),
  muteConversation: (conversationId: string) =>
    api.post(`/messages/conversations/${conversationId}/mute`),
  deleteConversation: (conversationId: string) =>
    api.delete(`/messages/conversations/${conversationId}`),
  searchInConversation: (conversationId: string, q: string) =>
    api.get(`/messages/conversations/${conversationId}/search`, { params: { q } }),
  send: (data: SendMessagePayload) => api.post('/messages', data),
  sharePost: (receiverId: string, postId: string, content?: string) =>
    api.post('/messages/share-post', { receiver_id: receiverId, post_id: postId, content }),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  edit: (messageId: string, content: string) =>
    api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId: string, mode: 'me' | 'everyone' = 'me') =>
    api.delete(`/messages/${messageId}`, { params: { mode } }),
  markRead: (messageId: string) => api.put(`/messages/${messageId}/read`),
  react: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/react`, { emoji }),
  star: (messageId: string) => api.post(`/messages/${messageId}/star`),
  pinMessage: (messageId: string) => api.post(`/messages/${messageId}/pin`),
  forward: (messageId: string, receiverId: string) =>
    api.post(`/messages/${messageId}/forward`, { receiver_id: receiverId }),
  searchUsers: (q: string, limit?: number): Promise<{ data: { data: UserSearchResult[] } }> =>
    api.get('/messages/users/search', { params: { q, limit: limit || 20 } }),
  getBlocked: () => api.get('/messages/blocked'),
  blockUser: (userId: string) => api.post(`/messages/users/${userId}/block`),
  unblockUser: (userId: string) => api.delete(`/messages/users/${userId}/block`),
  reportUser: (userId: string, reason?: string) =>
    api.post(`/messages/users/${userId}/report`, { reason }),
};

export type { Message };
