import React, { useEffect, useState } from "react";
import ForecastChart from "../components/ForecastChart";
import Filters from "../components/Filters";

const Forecasts = () => {
  const [forecastData, setForecastData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    region: "",
    resourceType: ""
  });
  const [regions, setRegions] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);

  // Fetch available regions and resource types for filters
  useEffect(() => {
    async function fetchRegions() {
      try {
        const response = await fetch("/api/regions");
        const data = await response.json();
        setRegions(data.regions || []);
        setResourceTypes(data.resource_types || []);
      } catch (error) {
        console.error("Error fetching regions/resource types:", error);
      }
    }
    fetchRegions();
  }, []);

  // Fetch forecast and recommendations when filters change
  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams();
        params.append("days", 30);
        if (filters.region) params.append("region", filters.region);
        if (filters.resourceType) params.append("resource_type", filters.resourceType);
        // Optionally add date filters if backend supports

        const forecastResponse = await fetch(`/api/forecast?${params.toString()}`);
        const forecastJson = await forecastResponse.json();
        setForecastData(forecastJson);

        const recResponse = await fetch(`/api/recommendations?days=7&${params.toString()}`);
        const recJson = await recResponse.json();
        setRecommendations(recJson);
      } catch (error) {
        console.error("Error fetching forecast or recommendations:", error);
      }
    }
    fetchData();
  }, [filters]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>CPU Usage Forecast (30 days)</h2>
      <Filters
        filters={filters}
        setFilters={setFilters}
        regions={regions}
        resourceTypes={resourceTypes}
      />
      {forecastData.length > 0 ? (
        <ForecastChart filters={filters} forecastData={forecastData} />
      ) : (
        <p>No forecast data available for the selected filters.</p>
      )}
      <h3>Recommendations</h3>
      {recommendations.length > 0 ? (
        <ul>
          {recommendations.map((rec, idx) => (
            <li key={idx}>
              {rec.date}: {rec.recommendation} (Predicted CPU: {rec.predicted_cpu})
            </li>
          ))}
        </ul>
      ) : (
        <p>No recommendations available for the selected filters.</p>
      )}
    </div>
  );
};

export default Forecasts;
