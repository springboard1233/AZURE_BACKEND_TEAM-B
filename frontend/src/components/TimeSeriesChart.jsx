import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { getCPUUsage } from "../services/api";
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const TimeSeriesChart = () => {
  const [chartData, setChartData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const data = await getCPUUsage();
      const dates = data.map(d => d.date);
      const usage = data.map(d => d.cpu_usage);

      setChartData({
        labels: dates,
        datasets: [
          {
            label: "CPU Usage",
            data: usage,
            borderColor: "blue",
            backgroundColor: "lightblue",
          }
        ]
      });
    };
    fetchData();
  }, []);

  return <Line data={chartData} />;
};

export default TimeSeriesChart;

