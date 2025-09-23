import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = ({ data, title, xAxisLabel = 'Date', yAxisLabel = 'Value' }) => {
  const labels = data.map(item => item.date || item.label);
  const datasets = [];

  if (data.length > 0 && 'usage_cpu' in data[0]) {
    datasets.push({
      label: 'CPU Usage (Raw)',
      data: data.map(item => item.usage_cpu),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
    });
  }

  if (data.length > 0 && 'usage_cpu_7day_roll_avg' in data[0]) {
    datasets.push({
      label: 'CPU Usage (7-Day Rolling Avg)',
      data: data.map(item => item.usage_cpu_7day_roll_avg),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
    });
  }

  // Fallback for single value
  if (datasets.length === 0) {
    datasets.push({
      label: yAxisLabel,
      data: data.map(item => item.value || item.usage_storage || item.usage_cpu),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    });
  }

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: xAxisLabel,
        },
      },
      y: {
        title: {
          display: true,
          text: yAxisLabel,
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default LineChart;
