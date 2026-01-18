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
    const token = localStorage.getItem('zplusenews_token');
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
      localStorage.removeItem('zplusenews_token');
      // Redirect to login if needed
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
};

// Events
export const eventsAPI = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
};

// Interviews
export const interviewsAPI = {
  getAll: () => api.get('/interviews'),
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
  getAll: () => api.get('/videos'),
};

// Clients
export const clientsAPI = {
  getAll: () => api.get('/clients'),
};

// Health
export const healthAPI = {
  check: () => api.get('/health'),
};
