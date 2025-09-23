import React, { useState, useEffect } from 'react';
import LineChart from '../components/LineChart';
import PieChartComponent from '../components/PieChartComponent';
import BarChart from '../components/BarChart';
import SeasonalPatterns from '../components/SeasonalPatterns';
import ComparisonChart from '../components/ComparisonChart';
import Filters from '../components/Filters';
import apiService from '../services/apiService';

const Overview = () => {
  const [usageTrends, setUsageTrends] = useState([]);
  const [topRegions, setTopRegions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    region: '',
    resourceType: ''
  });
  const [regions, setRegions] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [trendsData, regionsData, insightsData, featuresData] = await Promise.all([
          apiService.getUsageTrends(),
          apiService.getTopRegions(),
          apiService.getInsights(),
          apiService.getFeatures()
        ]);

        setUsageTrends(trendsData);
        setTopRegions(regionsData);
        setInsights(insightsData);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Error loading overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Azure Backend Dashboard</h1>
        <p className="text-gray-600">Monitor and analyze Azure resource usage patterns</p>
      </div>

      {/* Filters */}
      <Filters
        filters={filters}
        setFilters={setFilters}
        regions={regions}
        resourceTypes={resourceTypes}
      />

      {/* Key Metrics Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Peak Usage</p>
                <p className="text-2xl font-bold text-gray-900">{insights.peak_usage?.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">🌍</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Top Region</p>
                <p className="text-2xl font-bold text-gray-900">{insights.top_region}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">💾</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Storage Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights.avg_storage_efficiency ? `${(insights.avg_storage_efficiency * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CPU Usage Trends */}
        <div className="lg:col-span-2">
          <LineChart
            data={usageTrends}
            title="CPU Usage Trends Over Time"
            xAxisLabel="Date"
            yAxisLabel="CPU Usage (%)"
          />
        </div>

        {/* Regional Distribution */}
        <PieChartComponent
          data={topRegions}
          title="CPU Demand Distribution by Region"
        />

        {/* Storage Usage by Region */}
        <BarChart
          data={topRegions}
          title="Storage Usage by Region"
          xAxisLabel="Region"
          yAxisLabel="Storage Usage"
        />
      </div>

      {/* Seasonal Patterns */}
      <SeasonalPatterns filters={filters} />

      {/* Comparison Chart */}
      <ComparisonChart filters={filters} />

      {/* Top Regions Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Top Regions by CPU Usage</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average CPU Usage
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Storage Usage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topRegions.map((region, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {region.region}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {region.usage_cpu?.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {region.usage_storage?.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Overview;
