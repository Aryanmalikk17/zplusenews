import axios from 'axios';

// Create axios instance with base configuration
// withCredentials: true is REQUIRED so the browser sends the httpOnly adminToken cookie
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach Bearer token only for legacy user (non-admin) endpoints
api.interceptors.request.use(
  (config) => {
    // Admin auth is now via httpOnly cookie (sent automatically by withCredentials).
    // Only attach Bearer token for regular user sessions if present.
    const userToken = localStorage.getItem('zplusenews_token');
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale session data on auth failure
      localStorage.removeItem('adminUser');
      localStorage.removeItem('zplusenews_token');
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;

// ============ API ENDPOINTS ============

// Articles
export const articlesAPI = {
  getAll: (params) => api.get('/articles', { params }),
  getById: (id) => api.get(`/articles/${id}`),
  getBySlug: (slug) => api.get(`/articles/slug/${slug}`),
  getPublicList: (params) => api.get('/articles/public/list', { params }),
  incrementViews: (id) => api.put(`/articles/${id}/view`),
  // Admin methods
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
};

// Events
export const eventsAPI = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
};

// Interviews
export const interviewsAPI = {
  getAll: () => api.get('/interviews'),
  getById: (id) => api.get(`/interviews/${id}`),
  create: (data) => api.post('/interviews', data),
  update: (id, data) => api.put(`/interviews/${id}`, data),
  delete: (id) => api.delete(`/interviews/${id}`),
};

// Advertisements
export const adsAPI = {
  getAll: () => api.get('/advertisements'),
  getById: (id) => api.get(`/advertisements/${id}`),
  create: (data) => api.post('/advertisements', data),
  update: (id, data) => api.put(`/advertisements/${id}`, data),
  delete: (id) => api.delete(`/advertisements/${id}`),
  trackImpression: (id, position) => 
    api.post(`/advertisements/${id}/impression`, { position }),
  trackClick: (id, position) => 
    api.post(`/advertisements/${id}/click`, { position }),
};

// Videos
export const videosAPI = {
  getAll: (params) => api.get('/videos', { params }),
  getById: (id) => api.get(`/videos/${id}`),
  getByVideoId: (videoId) => api.get(`/videos/by-video-id/${videoId}`),
  create: (data) => api.post('/videos', data),
  update: (id, data) => api.put(`/videos/${id}`, data),
  delete: (id) => api.delete(`/videos/${id}`),
  addById: (videoId, category) => api.post('/videos/add-by-id', { videoId, category }),
  transcribe: (id) => api.post(`/videos/${id}/transcribe`),
  syncChannel: (channelHandle, category) => api.post('/videos/sync-channel', { channelHandle, category }),
  transcribeAll: () => api.post('/videos/transcribe-all'),
};

// Clients
export const clientsAPI = {
  getAll: () => api.get('/clients'),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// Health
export const healthAPI = {
  check: () => api.get('/health'),
};

// Admin
export const adminAPI = {
  login: (credentials) => api.post('/admin/login', credentials),
  logout: () => api.post('/admin/logout'),
  changePassword: (data) => api.put('/admin/change-password', data),
  getPendingUsers: () => api.get('/admin/pending-users'),
  approveUser: (id) => api.post(`/admin/approve-user/${id}`),
  rejectUser: (id, reason) => api.post(`/admin/reject-user/${id}`, { reason }),
};
