import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request cache for GET requests
const requestCache = new Map();

// Cache helper
const getCachedData = (key) => {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < 60000) { // 5 minutes cache
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  requestCache.set(key, { data, timestamp: Date.now() });
};

const cachedResponse = (data) => Promise.resolve({ data });

const clearTaskCache = () => {
  Array.from(requestCache.keys()).forEach((key) => {
    if (
      key.startsWith('tasks_') ||
      key.startsWith('task_') ||
      key.startsWith('activity_feed_') ||
      key === 'task_stats'
    ) {
      requestCache.delete(key);
    }
  });
};

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

// Handle response errors with retry mechanism
api.interceptors.response.use(
  (response) => {
    // Cache successful GET requests
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = response.config.url?.replace(API_URL, '');
      if (cacheKey) {
        setCachedData(cacheKey, response.data);
      }
    }
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    
    // Retry on network errors or 5xx errors
    if (error.code === 'NETWORK_ERROR' || 
        (error.response?.status >= 500 && error.response?.status < 600) ||
        error.code === 'ECONNABORTED') {
      
      // Retry logic
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }
      
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        return api(originalRequest);
      }
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Clear cache on error
    if (originalRequest?.url) {
      const cacheKey = originalRequest.url?.replace(API_URL, '');
      requestCache.delete(cacheKey);
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
  create: (data) => {
    clearTaskCache();
    return api.post('/tasks', data).finally(clearTaskCache);
  },
  getAll: (params) => {
    return api.get('/tasks', { params });
  },
  getById: (id) => {
    const cacheKey = `task_${id}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cachedResponse(cached);
    
    return api.get(`/tasks/${id}`).then(response => {
      setCachedData(cacheKey, response.data);
      return response;
    });
  },
  update: (id, data) => {
    clearTaskCache();
    return api.put(`/tasks/${id}`, data).finally(clearTaskCache);
  },
  delete: (id) => {
    clearTaskCache();
    return api.delete(`/tasks/${id}`).finally(clearTaskCache);
  },
  getStats: () => {
    return api.get('/tasks/stats/dashboard');
  },
  getActivityFeed: (params) => {
    return api.get('/tasks/activity/feed', { params });
  },
  getAttachments: (taskId) => api.get(`/tasks/${taskId}/attachments`),
  uploadAttachments: (taskId, formData) => {
    clearTaskCache();
    return api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).finally(clearTaskCache);
  },
  downloadAttachment: (attachmentId) => api.get(`/tasks/attachments/${attachmentId}/download`, {
    responseType: 'blob'
  }),
  // New enhanced endpoints
  updateStatus: (id, data) => {
    clearTaskCache();
    return api.patch(`/tasks/${id}/status`, data).finally(clearTaskCache);
  },
  sendEmailNotifications: () => api.get('/tasks/send-email-notifications')
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
