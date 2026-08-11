import api from './api';

export const authService = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: { email: string; password: string; department_id?: string }) => api.post('/auth/login', data),
  refresh: (token: string) => api.post('/auth/refresh', { refresh_token: token }),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, new_password: password }),
};
