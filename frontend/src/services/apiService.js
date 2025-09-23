import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Usage Trends API
  async getUsageTrends(region = null) {
    try {
      const params = region ? { region } : {};
      const response = await this.client.get('/usage-trends', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching usage trends:', error);
      return [];
    }
  }

  // Top Regions API
  async getTopRegions() {
    try {
      const response = await this.client.get('/top-regions');
      return response.data;
    } catch (error) {
      console.error('Error fetching top regions:', error);
      return [];
    }
  }

  // Raw Data API
  async getRawData() {
    try {
      const response = await this.client.get('/raw-data');
      return response.data;
    } catch (error) {
      console.error('Error fetching raw data:', error);
      return [];
    }
  }

  // Features API
  async getFeatures() {
    try {
      const response = await this.client.get('/features');
      return response.data;
    } catch (error) {
      console.error('Error fetching features:', error);
      return [];
    }
  }

  // Insights API
  async getInsights() {
    try {
      const response = await this.client.get('/insights');
      return response.data;
    } catch (error) {
      console.error('Error fetching insights:', error);
      return null;
    }
  }

  // Test connection
  async ping() {
    try {
      const response = await this.client.get('/ping');
      return response.data;
    } catch (error) {
      console.error('Error pinging API:', error);
      return { status: 'error', message: 'Cannot connect to backend' };
    }
  }
}

export default new ApiService();
