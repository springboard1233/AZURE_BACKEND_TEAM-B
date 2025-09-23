import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';

function SeasonalPatterns({ filters }) {
  const [monthlyData, setMonthlyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filters.startDate || !filters.endDate) return;

    setLoading(true);
    setError(null);

    // Fetch insights for monthly pattern
    axios.get('/api/insights', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        region: filters.region,
      }
    }).then(res => {
      const insights = res.data;
      setMonthlyData({
        months: Object.keys(insights.monthly_avg_cpu),
        cpuUsage: Object.values(insights.monthly_avg_cpu)
      });
      setLoading(false);
    }).catch(() => {
      setError('Failed to load monthly seasonal patterns');
      setLoading(false);
    });

    // Fetch features for weekly pattern
    axios.get('/api/features', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        region: filters.region,
      }
    }).then(res => {
      const data = res.data;
      const weekly = {};
      data.forEach(d => {
        const day = d.day_of_week;
        if (day !== undefined && day !== null) {
          if (!weekly[day]) weekly[day] = [];
          weekly[day].push(d.usage_cpu);
        }
      });
      const days = Object.keys(weekly).sort((a, b) => a - b); // sort numerically
      const avgCpu = days.map(day => {
        const values = weekly[day].filter(v => !isNaN(v));
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      });
      setWeeklyData({
        days: days.map(d => `Day ${d}`), // label as Day 0, Day 1, etc.
        cpuUsage: avgCpu
      });
      setLoading(false);
    }).catch(() => {
      setError('Failed to load weekly seasonal patterns');
      setLoading(false);
    });
  }, [filters]);

  if (loading) return <p>Loading seasonal patterns...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!monthlyData || !weeklyData) return <p>No seasonal pattern data available.</p>;

  const monthlyChartData = {
    labels: monthlyData.months,
    datasets: [{
      label: 'Average CPU Usage by Month',
      data: monthlyData.cpuUsage,
      backgroundColor: '#2B88D8',
    }]
  };

  const weeklyChartData = {
    labels: weeklyData.days,
    datasets: [{
      label: 'Average CPU Usage by Day of Week',
      data: weeklyData.cpuUsage,
      backgroundColor: '#107C10',
    }]
  };

  return (
    <div style={{ marginBottom: 30 }}>
      <h3>Seasonal Patterns</h3>
      <div style={{ display: 'flex', gap: 40 }}>
        <div style={{ flex: 1 }}>
          <h4>Monthly Variation</h4>
          <Bar data={monthlyChartData} />
        </div>
        <div style={{ flex: 1 }}>
          <h4>Weekly Variation</h4>
          <Bar data={weeklyChartData} />
        </div>
      </div>
    </div>
  );
}

export default SeasonalPatterns;