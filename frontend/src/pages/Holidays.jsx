import React, { useState, useEffect } from "react";
import { getFeatures } from "../services/api";

const Holidays = ({ filters }) => {
  const [holidayData, setHolidayData] = useState(null);
  const [forecastData, setForecastData] = useState({});
  const [loading, setLoading] = useState(true);
  const [analysisType, setAnalysisType] = useState("engagement"); // "engagement", "forecast", "both"
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const features = await getFeatures(filters);
        setHolidayData(features);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setHolidayData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [filters]);

  const runHolidayAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const baseUrl = "http://localhost:5000/api";

      let requestData = {
        holidays_csv: "backend/data/raw/external_factors.csv", // Assuming holidays are in external_factors
        timestamp_col: "date",
        holiday_window: 2,
        forecast_steps: 14,
        outdir: "outputs"
      };

      // Add engagement data if selected
      if (analysisType === "engagement" || analysisType === "both") {
        requestData.engagement_csv = "backend/data/processed/feature_engineered.csv";
        requestData.user_col = "users_active";
        requestData.event_count_col = "usage_cpu"; // Using CPU usage as proxy for engagement
      }

      // Add resource data if selected
      if (analysisType === "forecast" || analysisType === "both") {
        requestData.resource_csv = "backend/data/processed/feature_engineered.csv";
        requestData.metric_cols = ["usage_cpu", "usage_storage"];
      }

      const response = await fetch(`${baseUrl}/holiday-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setForecastData(results);

    } catch (error) {
      console.error("Error running holiday analysis:", error);
      setForecastData({ error: error.message });
    } finally {
      setRunningAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h2 className="text-2xl font-bold mb-4">Holiday Impact & Forecast Analysis</h2>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading holiday data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2 className="text-2xl font-bold mb-4">Holiday Impact & Forecast Analysis</h2>

      {/* Analysis Configuration */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Analysis Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Analysis Type</label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="engagement">Holiday Impact on User Engagement</option>
              <option value="forecast">Resource Usage Forecast</option>
              <option value="both">Both Impact & Forecast</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={runHolidayAnalysis}
              disabled={runningAnalysis}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {runningAnalysis ? "Running Analysis..." : "Run Analysis"}
            </button>
          </div>
        </div>
      </div>

      {/* Results Display */}
      {Object.keys(forecastData).length > 0 && (
        <div className="space-y-6">
          {/* Engagement Impact Results */}
          {(forecastData.engagement_kpis || forecastData.holiday_impact_summary) && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Holiday Impact on User Engagement</h3>

              {forecastData.engagement_kpis && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Daily Engagement KPIs</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">DAU</th>
                          <th className="px-4 py-2 text-left">Total Events</th>
                          <th className="px-4 py-2 text-left">Avg Events/User</th>
                          <th className="px-4 py-2 text-left">Holiday</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastData.engagement_kpis.slice(0, 10).map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{item.timestamp || item.date}</td>
                            <td className="px-4 py-2">{item.dau}</td>
                            <td className="px-4 py-2">{item.total_events}</td>
                            <td className="px-4 py-2">{item.avg_events_per_user?.toFixed(2)}</td>
                            <td className="px-4 py-2">{item.holiday_name || "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {forecastData.holiday_impact_summary && (
                <div>
                  <h4 className="font-medium mb-2">Holiday Impact Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {forecastData.holiday_impact_summary.map((item, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded">
                        <div className="font-medium">{item.metric}</div>
                        <div className="text-sm text-gray-600">
                          Holiday: {item.holiday_mean?.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Baseline: {item.baseline_mean?.toFixed(2)}
                        </div>
                        <div className={`text-lg font-bold ${item.impact_percentage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Impact: {item.impact_percentage?.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Forecast Results */}
          {Object.keys(forecastData).filter(key => key.startsWith('forecast_')).length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Resource Usage Forecasts</h3>

              {Object.keys(forecastData)
                .filter(key => key.startsWith('forecast_'))
                .map(metricKey => {
                  const metric = metricKey.replace('forecast_', '');
                  const data = forecastData[metricKey];

                  return (
                    <div key={metric} className="mb-6">
                      <h4 className="font-medium mb-2 capitalize">{metric} Forecast</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2 text-left">Date</th>
                              <th className="px-4 py-2 text-left">Forecast</th>
                              <th className="px-4 py-2 text-left">Lower CI</th>
                              <th className="px-4 py-2 text-left">Upper CI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.slice(0, 7).map((item, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-2">{item.date || `Day ${index + 1}`}</td>
                                <td className="px-4 py-2 font-bold">{item.forecast?.toFixed(2)}</td>
                                <td className="px-4 py-2">{item.lower_ci?.toFixed(2)}</td>
                                <td className="px-4 py-2">{item.upper_ci?.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Error Display */}
          {forecastData.error && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Analysis Error</h4>
              <p className="text-red-600">{forecastData.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {Object.keys(forecastData).length === 0 && !runningAnalysis && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">How to Use</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Select the type of analysis you want to run</li>
            <li>• Click "Run Analysis" to process holiday impact and forecasts</li>
            <li>• Results will be displayed in tables above</li>
            <li>• The analysis uses your existing feature-engineered dataset</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Holidays;
