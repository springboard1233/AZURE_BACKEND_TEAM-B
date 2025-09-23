import { Link } from "react-router-dom";

const Sidebar = () => (
  <div className="w-64 h-screen bg-gray-800 text-white p-4">
    <h2 className="text-xl font-bold mb-4">Azure Dashboard</h2>
    <nav className="flex flex-col gap-2">
      <Link to="/trends">Usage Trends</Link>
      <Link to="/forecasts">Forecasts</Link>
      <Link to="/reports">Reports</Link>
    </nav>
  </div>
);

export default Sidebar;


api.js
import axios from "axios";

const API = axios.create({
  baseURL: "/api", // relative path uses Vite proxy
});

export const fetchCPUUsage = () => API.get("/cpu_usage");
export const fetchStorageUsage = () => API.get("/storage_usage");
export const fetchUsageTrends = () => API.get("/usage/trends");
export const fetchForecast = () => API.get("/forecast");
export const fetchRecommendations = () => API.get("/recommendations");
export const uploadFile = (formData) => API.post("/upload", formData);

