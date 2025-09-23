import React, { useState, useEffect } from 'react';
import PieChartComponent from '../components/PieChartComponent';
import BarChart from '../components/BarChart';
import apiService from '../services/apiService';

const Regional = () => {
  const [topRegions, setTopRegions] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('usage_cpu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [regionsData, rawDataResponse] = await Promise.all([
          apiService.getTopRegions(),
          apiService.getRawData()
        ]);

        setTopRegions(regionsData);
        setRawData(rawDataResponse);
      } catch (err) {
        setError('Failed to load regional data');
        console.error('Error loading regional data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRegionalStats = () => {
    if (!rawData.length) return {};

    const regionStats = {};
    rawData.forEach(record => {
      const region = record.region;
      if (!regionStats[region]) {
        regionStats[region] = {
          total_cpu: 0,
          total_storage: 0,
          total_users: 0,
          count: 0
        };
      }
      regionStats[region].total_cpu += record.usage_cpu || 0;
      regionStats[region].total_storage += record.usage_storage || 0;
      regionStats[region].total_users += record.users_active || 0;
      regionStats[region].count += 1;
    });

    // Calculate averages
    Object.keys(regionStats).forEach(region => {
      regionStats[region].avg_cpu = regionStats[region].total_cpu / regionStats[region].count;
      regionStats[region].avg_storage = regionStats[region].total_storage / regionStats[region].count;
      regionStats[region].avg_users = regionStats[region].total_users / regionStats[region].count;
    });

    return regionStats;
  };

  const regionStats = getRegionalStats();

  const getChartData = () => {
    return Object.entries(regionStats).map(([region, stats]) => ({
      region,
      value: stats[`avg_${selectedMetric.replace('usage_', '')}`] || stats.avg_cpu
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading regional analysis...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Regional Analysis</h1>
        <p className="text-gray-600">Compare Azure resource usage across different regions</p>
      </div>

      {/* Metric Selector */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-4">
          <label htmlFor="metric-select" className="text-sm font-medium text-gray-700">
            Select Metric:
          </label>
          <select
            id="metric-select"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="usage_cpu">CPU Usage</option>
            <option value="usage_storage">Storage Usage</option>
            <option value="users_active">Active Users</option>
          </select>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PieChartComponent
          data={getChartData()}
          title={`Regional Distribution - ${selectedMetric.replace('_', ' ').toUpperCase()}`}
        />

        <BarChart
          data={getChartData()}
          title={`Regional Comparison - ${selectedMetric.replace('_', ' ').toUpperCase()}`}
          xAxisLabel="Region"
          yAxisLabel={selectedMetric.replace('_', ' ').toUpperCase()}
        />
      </div>

      {/* Regional Statistics Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Regional Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg CPU Usage (%)
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Storage Usage
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Active Users
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(regionStats).map(([region, stats]) => (
                <tr key={region} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {region}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {stats.avg_cpu?.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {stats.avg_storage?.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {stats.avg_users?.toFixed(0)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {stats.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Regions Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Top Performing Regions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topRegions.slice(0, 4).map((region, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                #{index + 1}
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                {region.region}
              </div>
              <div className="text-xs text-gray-600">
                {region.usage_cpu?.toFixed(1)}% CPU
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Regional;
