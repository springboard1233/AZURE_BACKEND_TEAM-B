import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { getFeatures } from "../services/api";

export default function ForecastChart({ filters, forecastData = [] }) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await getFeatures(filters);
      if (!data.length) return;
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      const labels = data.map((d) => d.date);
      const values = data.map((d) => d.usage_cpu);
      // Calculate 7-day rolling average manually to ensure correctness
      function rollingAverage(data, windowSize) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
          if (i < windowSize - 1) {
            result.push(null); // not enough data yet
          } else {
            let sum = 0;
            for (let j = i - windowSize + 1; j <= i; j++) {
              sum += data[j];
            }
            result.push(sum / windowSize);
          }
        }
        return result;
      }

      const roll7ValuesManual = rollingAverage(values, 7);

      // Prepare forecast data
      const forecastLabels = forecastData.map((d) => d.date);
      const forecastValues = forecastData.map((d) => d.predicted_cpu);

      // Combine labels and values for chart
      const combinedLabels = [...labels, ...forecastLabels];
      const combinedActualValues = [...values, ...Array(forecastValues.length).fill(null)];
      const combinedRoll7Values = [...roll7ValuesManual, ...Array(forecastValues.length).fill(null)];
      const combinedForecastValues = [...Array(values.length).fill(null), ...forecastValues];

      setChartData({
        labels: combinedLabels,
        datasets: [
          {
            label: "CPU Usage (Actual)",
            data: combinedActualValues,
            borderColor: "blue",
            backgroundColor: "rgba(0,0,255,0.2)",
            tension: 0.3,
          },
          {
            label: "CPU Usage 7-day Roll (Avg)",
            data: combinedRoll7Values,
            borderColor: "pink",
            backgroundColor: "rgba(255,192,203,0.2)",
            tension: 0.3,
          },
          {
            label: "CPU Usage (Forecast)",
            data: combinedForecastValues,
            borderColor: "red",
            backgroundColor: "rgba(255,0,0,0.2)",
            borderDash: [5, 5],
            tension: 0.3,
          },
        ],
      });
    }
    load();
  }, [filters, forecastData]);

  if (!chartData) return <p>No data available</p>;

  return (
    <div>
      <h3>CPU Usage Trend</h3>
      <Line data={chartData} />
    </div>
  );
}
