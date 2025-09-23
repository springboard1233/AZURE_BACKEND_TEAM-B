import React from "react";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const UserEngagementCorrelationChart = ({ data }) => {
  // data expected to be an array of objects with region, resourceUsage, and userEngagement fields

  // Group data by region for better visualization
  const regionGroups = {};
  data.forEach(item => {
    const region = item.region || 'Unknown';
    if (!regionGroups[region]) {
      regionGroups[region] = [];
    }
    regionGroups[region].push(item);
  });

  // Calculate average values per region
  const chartData = {
    datasets: Object.keys(regionGroups).map((region, index) => {
      const regionData = regionGroups[region];
      const avgResourceUsage = regionData.reduce((sum, item) => sum + (item.resourceUsage || 0), 0) / regionData.length;
      const avgUserEngagement = regionData.reduce((sum, item) => sum + (item.userEngagement || 0), 0) / regionData.length;

      return {
        label: region,
        data: [{
          x: avgResourceUsage,
          y: avgUserEngagement,
          r: Math.max(5, Math.min(20, regionData.length)) // bubble size based on data points
        }],
        backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
        borderColor: `hsl(${index * 60}, 70%, 40%)`,
      };
    })
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "User Engagement vs Resource Usage by Region",
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataset = context.dataset;
            const dataPoint = dataset.data[context.dataIndex];
            return [
              `Region: ${dataset.label}`,
              `Avg Resource Usage: ${dataPoint.x.toFixed(2)}`,
              `Avg User Engagement: ${dataPoint.y.toFixed(2)}`,
              `Data Points: ${dataPoint.r}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Average Resource Usage (CPU)",
        },
        beginAtZero: true,
      },
      y: {
        title: {
          display: true,
          text: "Average User Engagement",
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <h3>User Engagement Correlation Analysis</h3>
      <Scatter data={chartData} options={options} />
      <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
        This chart shows the correlation between resource usage and user engagement across different regions.
        Each bubble represents a region with size indicating the number of data points.
      </p>
    </div>
  );
};

export default UserEngagementCorrelationChart;
