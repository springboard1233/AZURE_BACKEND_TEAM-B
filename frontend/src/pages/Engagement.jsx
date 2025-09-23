import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { dataService } from "../services/dataService";

const Engagement = () => {
  const chartRef = useRef(null);
  const bubbleChartInstance = React.useRef(null);
  const [engagementData, setEngagementData] = useState([]);

  useEffect(() => {
    const fetchEngagementData = async () => {
      try {
        const data = await dataService.getUserEngagementMetrics();
        setEngagementData(data);
      } catch (error) {
        console.error("Error fetching engagement data:", error);
        setEngagementData([]);
      }
    };

    fetchEngagementData();
  }, []);

  useEffect(() => {
    if (bubbleChartInstance.current) {
      bubbleChartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");

    const data = {
      datasets: [
        {
          label: "User Engagement",
          data: engagementData.map((d) => ({
            x: parseFloat(d.cpu_usage) || 0,
            y: parseFloat(d.active_users) || 0,
            r: parseFloat(d.engagement_score) || 10,
          })),
          backgroundColor: "rgba(59, 130, 246, 0.5)", // Tailwind blue-500 with opacity
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "CPU Usage",
          },
          min: 0,
          max: 1,
        },
        y: {
          title: {
            display: true,
            text: "Active Users",
          },
          min: 0,
          max: 100,
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          enabled: true,
        },
      },
    };

    bubbleChartInstance.current = new Chart(ctx, {
      type: "bubble",
      data: data,
      options: options,
    });

    return () => {
      if (bubbleChartInstance.current) {
        bubbleChartInstance.current.destroy();
      }
    };
  }, [engagementData]);

  return (
    <div className="h-full p-6 bg-card rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">User Engagement Bubble Chart</h2>
      <div className="relative h-96">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default Engagement;
