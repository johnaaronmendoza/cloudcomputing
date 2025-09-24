import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  
  register: (userData: any) =>
    api.post('/api/auth/register', userData),
  
  getProfile: () =>
    api.get('/api/auth/profile'),
  
  updateProfile: (userData: any) =>
    api.put('/api/auth/profile', userData),
  
  refreshToken: () =>
    api.post('/api/auth/refresh'),
};

export const tasksAPI = {
  getTasks: (params?: any) =>
    api.get('/api/tasks', { params }),
  
  getTask: (id: string) =>
    api.get(`/api/tasks/${id}`),
  
  createTask: (taskData: any) =>
    api.post('/api/tasks', taskData),
  
  updateTask: (id: string, taskData: any) =>
    api.put(`/api/tasks/${id}`, taskData),
  
  deleteTask: (id: string) =>
    api.delete(`/api/tasks/${id}`),
  
  applyToTask: (id: string, applicationData: any) =>
    api.post(`/api/tasks/${id}/apply`, applicationData),
  
  getMyTasks: () =>
    api.get('/api/tasks/my-tasks'),
  
  getMyApplications: () =>
    api.get('/api/tasks/my-applications'),
};

export const searchAPI = {
  searchTasks: (query: string, filters?: any) =>
    api.get('/api/search/tasks', { params: { q: query, ...filters } }),
  
  getRecommendations: (type: 'tasks' | 'users', limit?: number) =>
    api.get('/api/search/recommendations', { params: { type, limit } }),
  
  getCategories: () =>
    api.get('/api/search/categories'),
};

export const contentAPI = {
  getContent: (params?: any) =>
    api.get('/api/content', { params }),
  
  uploadContent: (formData: FormData) =>
    api.post('/api/content/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getContentById: (id: string) =>
    api.get(`/api/content/${id}`),
  
  updateContent: (id: string, contentData: any) =>
    api.put(`/api/content/${id}`, contentData),
  
  deleteContent: (id: string) =>
    api.delete(`/api/content/${id}`),
};

export const matchingAPI = {
  getMatches: (taskId: string) =>
    api.get(`/api/matches/task/${taskId}`),
  
  getUserMatches: (userId: string) =>
    api.get(`/api/matches/user/${userId}`),
  
  getRecommendations: (type: 'tasks' | 'users', limit?: number) =>
    api.get('/api/recommendations', { params: { type, limit } }),
  
  updatePreferences: (preferences: any) =>
    api.put('/api/preferences', preferences),
  
  recordAction: (matchId: string, action: string) =>
    api.post(`/api/matches/${matchId}/action`, { action }),
};

export const monitoringAPI = {
  getOverview: () =>
    api.get('/api/overview'),
  
  getRealtimeMetrics: () =>
    api.get('/api/realtime'),
  
  getAnalytics: (period?: string) =>
    api.get('/api/analytics', { params: { period } }),
};
