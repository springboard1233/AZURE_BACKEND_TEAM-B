
import React, { useEffect, useState } from "react";
import { getInsights } from "../services/api";

export default function Insights({ filters }) {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await getInsights(filters);
      setInsights(data);
    }
    load();
  }, [filters]);

  if (!insights) return <p>Loading insights...</p>;

  return (
    <div>
      <h2>Insights Dashboard</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        <div>
          <h4>Peak Demand Dates</h4>
          <ul>
            {insights.peak_dates.map((d, i) => (
              <li key={i}>
                {d.date}: {d.cpu_total.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Top Regions</h4>
          <ul>
            {insights.top_regions.map((r, i) => (
              <li key={i}>
                {r.region}: {r.usage_cpu.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Avg Storage Efficiency</h4>
          <p>{insights.avg_storage_efficiency?.toFixed(3)}</p>
        </div>
      </div>
    </div>
  );
}

