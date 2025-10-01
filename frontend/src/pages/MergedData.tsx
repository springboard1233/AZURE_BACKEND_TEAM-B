import React, { useState, useEffect, useMemo } from "react";

interface DataRow {
  date: string;
  region: string;
  resource_type: string;
  usage_cpu: string;
  usage_storage: string;
  users_active: string;
  economic_index: string;
  cloud_market_demand: string;
  holiday: string;
}

const MergedData: React.FC = () => {
  const [mergedData, setMergedData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/merged-data")
      .then((res) => res.json())
      .then((res) => {
        setMergedData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch CSV data:", err);
        setError("Failed to load data");
        setLoading(false);
      });
  }, []);

  const columns = useMemo(() => (mergedData.length > 0 ? Object.keys(mergedData[0]) : []), [mergedData]);

  if (loading) return <div className="p-6 text-white">Loading merged data...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6">
      <div className="bg-gray-900 rounded-xl shadow overflow-hidden border border-gray-700">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Merged Data Table</h2>
          <span className="text-sm text-gray-400">{mergedData.length} rows</span>
        </div>
        <div className="overflow-x-auto">
          {mergedData.length === 0 ? (
            <div className="p-6 text-gray-400">No merged data available.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-700 text-sm text-gray-200">
              <thead className="bg-gray-800">
                <tr>
                  {columns.map((key) => (
                    <th key={key} className="px-4 py-3 text-left font-medium uppercase tracking-wide">
                      {key.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-800">
                {mergedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-800">
                    {columns.map((key) => (
                      <td key={key} className="px-4 py-3 whitespace-nowrap">
                        {row[key as keyof DataRow]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MergedData;
