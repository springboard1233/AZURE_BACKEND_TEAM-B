import React, { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { getInsights } from "../services/api";

export default function PieChart({ filters }) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    async function load() {
      const insights = await getInsights(filters);
      if (!insights.top_regions) return;
      const labels = insights.top_regions.map((r) => r.region);
      const values = insights.top_regions.map((r) => r.usage_cpu);

      setChartData({
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#8BC34A", "#FF9800"],
          },
        ],
      });
    }
    load();
  }, [filters]);

  if (!chartData) return <p>No region data</p>;

  return (
    <div>
      <h3>Top Regions CPU Usage</h3>
      <Pie data={chartData} />
    </div>
  );
}
