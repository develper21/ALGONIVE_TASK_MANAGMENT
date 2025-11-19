import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Team APIs
export const teamAPI = {
  create: (data) => api.post('/teams', data),
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  addMember: (id, data) => api.post(`/teams/${id}/add-member`, data),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/remove-member/${userId}`),
  update: (id, data) => api.put(`/teams/${id}`, data),
};

// Task APIs
export const taskAPI = {
  create: (data) => api.post('/tasks', data),
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getStats: () => api.get('/tasks/stats/dashboard'),
};

// Notification APIs
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const messagingAPI = {
  registerKey: (data) => api.post('/messaging/keys', data),
  lookupKeys: (data) => api.post('/messaging/keys/lookup', data),
  listConversations: () => api.get('/messaging/conversations'),
  createDirectConversation: (data) => api.post('/messaging/conversations/direct', data),
  createTeamConversation: (data) => api.post('/messaging/conversations/team', data),
  updateRetention: (conversationId, data) => api.patch(`/messaging/conversations/${conversationId}/retention`, data),
  getParticipants: (conversationId) => api.get(`/messaging/conversations/${conversationId}/participants`),
  getMessages: (conversationId, params) => api.get(`/messaging/messages/${conversationId}`, { params }),
  sendMessage: (data) => api.post('/messaging/messages', data),
  exportConversation: (conversationId) => api.get(`/messaging/export/${conversationId}`, { responseType: 'blob' }),
  searchMessages: (params) => api.get('/messaging/search', { params })
};

export default api;
