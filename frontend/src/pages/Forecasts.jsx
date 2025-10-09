

// frontend/src/pages/Forecasts.jsx

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, Calendar, TrendingUp, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import apiService from '../services/api';
import exportService from '../services/export';

const Forecasts = () => {
  const [region, setRegion] = useState('East US');
  const [service, setService] = useState('VM');
  const [horizon, setHorizon] = useState(30);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const regions = ['East US', 'West US', 'North Europe', 'Southeast Asia'];
  const services = ['VM', 'Storage', 'Container'];
  const horizons = [
    { value: 7, label: '7 Days' },
    { value: 14, label: '14 Days' },
    { value: 30, label: '30 Days' },
  ];

  const generateForecast = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiService.getForecast(region, service, horizon);
      setForecastData(data);
      setSuccess(`Forecast generated successfully for ${region} - ${service}!`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate forecast');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (forecastData) {
      exportService.downloadForecastCSV(forecastData);
    }
  };

  const downloadExcel = () => {
    if (forecastData) {
      exportService.downloadForecastExcel(forecastData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <TrendingUp className="text-blue-400" size={40} />
          ML-Powered Demand Forecasting
        </h1>
        <p className="text-blue-200">
          Advanced XGBoost predictions with 95% confidence intervals • R² = 0.8634
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-3 animate-pulse">
          <AlertCircle className="text-red-400" size={20} />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg flex items-center gap-3 animate-pulse">
          <CheckCircle className="text-green-400" size={20} />
          <span className="text-green-300">{success}</span>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700 mb-8 shadow-2xl">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Calendar className="text-blue-400" size={24} />
          Forecast Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Region Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              📍 Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Service Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              🖥️ Service Type
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {services.map((s) => (
                <option key={s} value={s}>
                  {s === 'VM' ? 'Compute (VM)' : s}
                </option>
              ))}
            </select>
          </div>

          {/* Time Horizon */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              📅 Time Horizon
            </label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full bg-slate-900/80 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {horizons.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={generateForecast}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Generating Forecast...
              </>
            ) : (
              <>
                <TrendingUp size={20} />
                Generate Forecast
              </>
            )}
          </button>

          {forecastData && (
  <button
    onClick={downloadCSV}
    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
  >
    <Download size={20} />
    Download CSV
  </button>
)}

        </div>
      </div>

      {/* Forecast Results */}
      {forecastData && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Average"
              value={`${forecastData.statistics.average.toFixed(2)}%`}
              color="blue"
              icon="📊"
            />
            <StatCard
              label="Minimum"
              value={`${forecastData.statistics.min.toFixed(2)}%`}
              color="green"
              icon="📉"
            />
            <StatCard
              label="Maximum"
              value={`${forecastData.statistics.max.toFixed(2)}%`}
              color="red"
              icon="📈"
            />
            <StatCard
              label="Trend"
              value={forecastData.statistics.trend}
              color="purple"
              icon="🔮"
            />
          </div>

          {/* Main Forecast Chart with Confidence Interval */}
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700 mb-8 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6">
              📈 Forecast with 95% Confidence Interval
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={forecastData.predictions}>
                <defs>
                  <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[50, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, 'CPU Usage']}
                />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Area
                  type="monotone"
                  dataKey="confidence_upper"
                  stroke="none"
                  fill="url(#colorConfidence)"
                  fillOpacity={0.3}
                  name="Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="confidence_lower"
                  stroke="none"
                  fill="url(#colorConfidence)"
                  fillOpacity={0.3}
                  name="Lower Bound"
                />
                <Line
                  type="monotone"
                  dataKey="prediction"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Predicted CPU Usage"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast Table */}
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700 shadow-2xl overflow-hidden">
            <h3 className="text-xl font-semibold text-white mb-6">📋 Detailed Forecast Data</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Prediction</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Lower Bound</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Upper Bound</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Day</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Weekend</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.predictions.slice(0, 10).map((pred, idx) => (
                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 text-slate-300">{pred.date}</td>
                      <td className="text-right py-3 px-4 text-blue-400 font-semibold">
                        {pred.prediction.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-4 text-green-400">
                        {pred.confidence_lower.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-4 text-red-400">
                        {pred.confidence_upper.toFixed(2)}%
                      </td>
                      <td className="text-center py-3 px-4 text-slate-300">{pred.day_of_week}</td>
                      <td className="text-center py-3 px-4">
                        {pred.is_weekend ? (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">Yes</span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-600/30 text-slate-400 rounded text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {forecastData.predictions.length > 10 && (
              <p className="text-sm text-slate-400 mt-4 text-center">
                Showing 10 of {forecastData.predictions.length} predictions. Download full data for complete view.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ label, value, color, icon }) => {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-500',
    green: 'from-green-600 to-green-500',
    red: 'from-red-600 to-red-500',
    purple: 'from-purple-600 to-purple-500',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 shadow-lg transform hover:scale-105 transition-transform`}>
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm text-white/80 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
};

export default Forecasts;
