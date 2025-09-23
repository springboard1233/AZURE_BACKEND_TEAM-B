import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';

function ComparisonChart({ filters }) {
  const [rawData, setRawData] = useState(null);
  const [featureData, setFeatureData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filters.startDate || !filters.endDate) return;

    setLoading(true);
    setError(null);

    // Fetch raw data (before feature engineering)
    const rawRequest = axios.get('/api/raw-data', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        region: filters.region,
      }
    });

    // Fetch feature engineered data (after feature engineering)
    const featureRequest = axios.get('/api/features', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        region: filters.region,
      }
    });

    Promise.all([rawRequest, featureRequest])
      .then(([rawRes, featureRes]) => {
        setRawData(rawRes.data);
        setFeatureData(featureRes.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load comparison data');
        setLoading(false);
      });
  }, [filters]);

  if (loading) return <p>Loading comparison chart...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!rawData || !featureData) return <p>No data available for selected filters.</p>;

  // Align data by date for plotting
  const dates = Array.from(new Set([...rawData.map(d => d.date), ...featureData.map(d => d.date)])).sort();

  const rawDataMap = rawData.reduce((acc, d) => {
    acc[d.date] = d.usage_cpu;
    return acc;
  }, {});

  const featureDataMap = featureData.reduce((acc, d) => {
    acc[d.date] = d.usage_cpu;
    return acc;
  }, {});

  // Use rolling averages from feature data for better comparison
  const rolling3Map = featureData.reduce((acc, d) => {
    acc[d.date] = d.usage_cpu_roll_mean_3;
    return acc;
  }, {});

  const rolling7Map = featureData.reduce((acc, d) => {
    acc[d.date] = d.usage_cpu_roll_mean_7;
    return acc;
  }, {});

  const chartData = {
    labels: dates,
    datasets: [
      {
        label: 'Before Feature Engineering',
        data: dates.map(date => rawDataMap[date] || null),
        borderColor: '#0078D4',
        backgroundColor: 'rgba(0, 120, 212, 0.1)',
        fill: false,
        yAxisID: 'y',
      },
      {
        label: 'After Feature Engineering',
        data: dates.map(date => featureDataMap[date] || null),
        borderColor: '#107C10',
        backgroundColor: 'rgba(16, 124, 16, 0.1)',
        fill: false,
        yAxisID: 'y',
      },
      {
        label: '3-Day Rolling Average',
        data: dates.map(date => rolling3Map[date] || null),
        borderColor: '#FF6B35',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        borderDash: [5, 5],
        fill: false,
        yAxisID: 'y1',
      },
      {
        label: '7-Day Rolling Average',
        data: dates.map(date => rolling7Map[date] || null),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderDash: [10, 5],
        fill: false,
        yAxisID: 'y1',
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'CPU Usage (%)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Rolling Average (%)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div style={{ marginBottom: 30 }}>
      <h3>Comparison: Before vs After Feature Engineering</h3>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default ComparisonChart;
