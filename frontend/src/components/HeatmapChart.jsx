import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { getCorrelations } from "../services/api";

const HeatmapChart = ({ filters = {} }) => {
  const [matrix, setMatrix] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const correlationData = await getCorrelations(filters);

        if (correlationData && correlationData.matrix && correlationData.features) {
          setMatrix(correlationData.matrix);
          setMetrics(correlationData.features);
        } else {
          // Fallback to default metrics if backend data not available
          setMetrics(["usage_cpu", "usage_storage", "users_active", "economic_index", "cloud_market_demand"]);
          setMatrix([]);
        }
      } catch (error) {
        console.error("Error fetching correlation data:", error);
        setMetrics([]);
        setMatrix([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filters]);

  return (
    <Plot
      data={[
        {
          z: matrix,
          x: metrics,
          y: metrics,
          type: "heatmap",
          colorscale: "RdBu",
          zmin: -1,
          zmax: 1,
        },
      ]}
      layout={{
        title: "Correlation Heatmap",
        xaxis: { side: "top" },
        yaxis: { autorange: "reversed" },
        margin: { t: 50, l: 100 },
      }}
      config={{ responsive: true }}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default HeatmapChart;
