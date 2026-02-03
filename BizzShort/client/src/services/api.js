import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token if available
api.interceptors.request.use(
  (config) => {
    // Check for user token first, then admin token
    const token = localStorage.getItem('zplusenews_token') || localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Only remove if it's the specific token being used? 
      // For now, let's be careful about auto-logout to avoid disrupting the user experience too much
      // localStorage.removeItem('zplusenews_token');
      // localStorage.removeItem('adminToken');
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
  create: (data) => api.post('/interviews', data),
  update: (id, data) => api.put(`/interviews/${id}`, data),
  delete: (id) => api.delete(`/interviews/${id}`),
};

// Advertisements
export const adsAPI = {
  getAll: () => api.get('/advertisements'),
  trackImpression: (id, position) => 
    api.post(`/advertisements/${id}/impression`, { position }),
  trackClick: (id, position) => 
    api.post(`/advertisements/${id}/click`, { position }),
};

// Videos
export const videosAPI = {
  getAll: (params) => api.get('/videos', { params }), // Added params support
  getById: (id) => api.get(`/videos/${id}`),
  create: (data) => api.post('/videos', data),
  update: (id, data) => api.put(`/videos/${id}`, data),
  delete: (id) => api.delete(`/videos/${id}`),
};

// Clients
export const clientsAPI = {
  getAll: () => api.get('/clients'),
};

// Health
export const healthAPI = {
  check: () => api.get('/health'),
};

// News (CurrentsAPI via backend proxy)
export const newsAPI = {
  getLatest: (params) => api.get('/news/latest', { params }),
  search: (params) => api.get('/news/search', { params }),
  getByCategory: (category, params = {}) => api.get(`/news/category/${category}`, { params }),
  getTrending: (params) => api.get('/news/trending', { params }),
};

