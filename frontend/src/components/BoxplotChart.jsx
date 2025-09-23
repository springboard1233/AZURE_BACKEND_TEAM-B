import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { getFeatures } from "../services/api";

const BoxplotChart = () => {
  const [plotData, setPlotData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const data = await getFeatures();
      const metrics = ["usage_cpu", "usage_storage", "users_active"];

      const boxData = metrics.map(m => ({
        y: data.map(d => parseFloat(d[m]) || 0),
        type: "box",
        name: m,
        boxpoints: "all",
        jitter: 0.5,
        marker: { color: "rgb(7,40,89)" },
        line: { color: "rgb(7,40,89)" }
      }));

      setPlotData(boxData);
    }
    fetchData();
  }, []);

  return (
    <Plot
      data={plotData}
      layout={{
        title: "Distribution of Key Metrics",
        boxmode: "group",
        margin: { t: 50, l: 50, r: 30, b: 50 },
      }}
      config={{ responsive: true }}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default BoxplotChart;
