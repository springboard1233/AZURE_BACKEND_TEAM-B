import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const getFeatures = async (filters = {}) => {
  const params = {};
  if (filters.region) params.region = filters.region;
  if (filters.resource_type) params.resource_type = filters.resource_type;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  const res = await axios.get(`${API_BASE}/features`, { params });
  return res.data;
};

export const getInsights = async (filters = {}) => {
  const params = {};
  if (filters.region) params.region = filters.region;
  if (filters.resource_type) params.resource_type = filters.resource_type;
  const res = await axios.get(`${API_BASE}/insights`, { params });
  return res.data;
};

export const getCpuUsage = async () => {
  const res = await axios.get(`${API_BASE}/cpu_usage`);
  return res.data;
};

export const getStorageUsage = async () => {
  const res = await axios.get(`${API_BASE}/storage_usage`);
  return res.data;
};

export const getRegions = async () => {
  const res = await axios.get(`${API_BASE}/regions`);
  return res.data;
};

export const getRecommendations = async (days = 7, filters = {}) => {
  const params = { days };
  if (filters.region) params.region = filters.region;
  if (filters.resource_type) params.resource_type = filters.resource_type;
  const res = await axios.get(`${API_BASE}/recommendations`, { params });
  return res.data;
};

export const getForecast = async (days = 30, filters = {}) => {
  const params = { days };
  if (filters.region) params.region = filters.region;
  if (filters.resource_type) params.resource_type = filters.resource_type;
  const res = await axios.get(`${API_BASE}/forecast`, { params });
  return res.data;
};

export const getHolidayImpact = async (data) => {
  const res = await axios.post(`${API_BASE}/holiday-impact`, data);
  return res.data;
};

export const getHolidayForecast = async (data) => {
  const res = await axios.post(`${API_BASE}/holiday-forecast`, data);
  return res.data;
};

export const getHolidayAnalysis = async (data) => {
  const res = await axios.post(`${API_BASE}/holiday-analysis`, data);
  return res.data;
};

export const getCorrelations = async (filters = {}) => {
  const params = {};
  if (filters.region) params.region = filters.region;
  if (filters.resource_type) params.resource_type = filters.resource_type;
  const res = await axios.get(`${API_BASE}/correlations`, { params });
  return res.data;
};

export const getUserEngagementMetrics = async () => {
  const res = await axios.get(`${API_BASE}/user-engagement-metrics`);
  return res.data;
};

export const getResourceEfficiencyData = async () => {
  const res = await axios.get(`${API_BASE}/resource-efficiency`);
  return res.data;
};

export const getEfficiencyTrends = async () => {
  const res = await axios.get(`${API_BASE}/efficiency-trends`);
  return res.data;
};
