// frontend/src/services/api.ts

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  health: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Get forecast for specific region and service
  getForecast: async (region: string, service: string, days: number = 30) => {
    const response = await api.get(`/api/forecast/${region}/${service}`, {
      params: { days },
    });
    return response.data;
  },

  // Get model metrics
  getModelMetrics: async () => {
    const response = await api.get('/api/model-metrics');
    return response.data;
  },

  // Get model comparison
  getModelComparison: async () => {
    const response = await api.get('/api/model-comparison');
    return response.data;
  },

  // Get feature importance
  getFeatureImportance: async () => {
    const response = await api.get('/api/feature-importance');
    return response.data;
  },

  // Get historical data
  getHistoricalData: async (region?: string, service?: string, limit: number = 100) => {
    const response = await api.get('/api/historical-data', {
      params: { region, service, limit },
    });
    return response.data;
  },
};

export default apiService;
