import React, { useState, useEffect } from 'react';
import LineChart from '../components/LineChart';
import apiService from '../services/apiService';

const Trends = () => {
  const [usageTrends, setUsageTrends] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [trendsData, regionsData] = await Promise.all([
          apiService.getUsageTrends(),
          apiService.getTopRegions()
        ]);

        setUsageTrends(trendsData);
        setRegions(regionsData.map(r => r.region));
      } catch (err) {
        setError('Failed to load trends data');
        console.error('Error loading trends data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRegionChange = async (region) => {
    setSelectedRegion(region);
    try {
      const trendsData = await apiService.getUsageTrends(region);
      setUsageTrends(trendsData);
    } catch (err) {
      console.error('Error fetching region-specific trends:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trends...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Usage Trends Analysis</h1>
        <p className="text-gray-600">Detailed analysis of Azure resource usage patterns over time</p>
      </div>

      {/* Region Filter */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-4">
          <label htmlFor="region-select" className="text-sm font-medium text-gray-700">
            Filter by Region:
          </label>
          <select
            id="region-select"
            value={selectedRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">All Regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="grid grid-cols-1 gap-8">
        <LineChart
          data={usageTrends}
          title={`CPU Usage Trends ${selectedRegion ? `for ${selectedRegion}` : '(All Regions)'}`}
          xAxisLabel="Date"
          yAxisLabel="CPU Usage (%)"
        />
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {usageTrends.length > 0 ? Math.max(...usageTrends.map(d => d.usage_cpu || 0)).toFixed(1) : '0'}%
            </div>
            <div className="text-sm text-gray-600">Peak CPU Usage</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {usageTrends.length > 0 ? (usageTrends.reduce((sum, d) => sum + (d.usage_cpu || 0), 0) / usageTrends.length).toFixed(1) : '0'}%
            </div>
            <div className="text-sm text-gray-600">Average CPU Usage</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {usageTrends.length}
            </div>
            <div className="text-sm text-gray-600">Data Points</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Usage Trends Data</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPU Usage (%)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageTrends.slice(0, 20).map((trend, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trend.date}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {trend.usage_cpu?.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {usageTrends.length > 20 && (
          <p className="text-sm text-gray-500 mt-4">
            Showing first 20 records of {usageTrends.length} total records
          </p>
        )}
      </div>
    </div>
  );
};

export default Trends;
