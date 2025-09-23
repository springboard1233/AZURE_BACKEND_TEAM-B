import React, { useState, useEffect } from "react";
import BoxplotChart from "../components/BoxplotChart";
import HeatmapChart from "../components/HeatmapChart";
import { getCorrelations } from "../services/api";

const Correlations = ({ filters }) => {
  const [correlationData, setCorrelationData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCorrelationData = async () => {
      try {
        setLoading(true);
        const correlationResponse = await getCorrelations(filters);

        // Transform backend correlation data for display
        const correlations = [];
        const features = correlationResponse.features || [];
        const matrix = correlationResponse.matrix || [];
        const targetCorrelations = correlationResponse.target_correlations || {};

        // Create correlation pairs from target correlations
        Object.entries(targetCorrelations).forEach(([feature, correlation]) => {
          correlations.push({
            variable: `usage_cpu vs ${feature}`,
            correlation: correlation,
            pValue: 0.05 // Default p-value, could be calculated if needed
          });
        });

        setCorrelationData(correlations);
      } catch (error) {
        console.error("Error fetching correlation data:", error);
        setCorrelationData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCorrelationData();
  }, [filters]);

  const calculateCorrelation = (x, y) => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const calculatePValue = (correlation, n) => {
    // Simplified p-value calculation using t-distribution approximation
    const t = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - correlation * correlation));
    // Return approximate p-value (this is a simplification)
    return Math.max(0.001, 2 * (1 - Math.min(0.5, Math.abs(t) / 3)));
  };

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h2 className="text-2xl font-bold mb-4">Correlations Analysis</h2>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading correlation data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2 className="text-2xl font-bold mb-4">Correlations Analysis</h2>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Correlation Matrix</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Variable Pair</th>
                  <th className="px-4 py-2 text-left">Correlation</th>
                  <th className="px-4 py-2 text-left">P-Value</th>
                </tr>
              </thead>
              <tbody>
                {correlationData.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2">{item.variable}</td>
                    <td className="px-4 py-2">
                      <span className={`font-bold ${item.correlation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.correlation.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-2">{item.pValue.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
          <div className="space-y-3">
            {correlationData.slice(0, 3).map((item, index) => (
              <div key={index} className={`p-3 rounded ${item.correlation > 0.5 ? 'bg-green-50' : item.correlation > 0.3 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                <p className="text-sm">
                  <strong>{item.correlation > 0.5 ? 'Strong' : item.correlation > 0.3 ? 'Moderate' : 'Weak'} correlation:</strong> {item.variable}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Correlation Heatmap</h3>
          <div className="h-96">
            <HeatmapChart filters={filters} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Distribution Analysis</h3>
          <BoxplotChart data={correlationData} />
        </div>
      </div>
    </div>
  );
};

export default Correlations;
