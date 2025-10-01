import React, { useState, useEffect, useMemo } from "react";

type CsvRecord = Record<string, string>;

const API_BASE = "http://127.0.0.1:8000";

const RawData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"azure" | "external">("azure");
  const [azureData, setAzureData] = useState<CsvRecord[]>([]);
  const [externalData, setExternalData] = useState<CsvRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [azureRes, externalRes] = await Promise.all([
          fetch(`${API_BASE}/api/raw/azure-usage`),
          fetch(`${API_BASE}/api/raw/external-factors`),
        ]);

        if (!azureRes.ok) {
          throw new Error("Failed to load Azure usage data");
        }
        if (!externalRes.ok) {
          throw new Error("Failed to load external factors data");
        }
        const azureJson = await azureRes.json();
        const externalJson = await externalRes.json();

        setAzureData(Array.isArray(azureJson.data) ? azureJson.data : []);
        setExternalData(Array.isArray(externalJson.data) ? externalJson.data : []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unexpected error loading raw data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const data = activeTab === "azure" ? azureData : externalData;
  const columns = useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data]);

  if (loading) {
    return <div className="p-6 text-white">Loading raw data...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded-md border ${
            activeTab === "azure"
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
          }`}
          onClick={() => setActiveTab("azure")}
        >
          Azure Usage
        </button>
        <button
          className={`px-4 py-2 rounded-md border ${
            activeTab === "external"
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
          }`}
          onClick={() => setActiveTab("external")}
        >
          External Factors
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl shadow overflow-hidden border border-gray-700">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {activeTab === "azure" ? "Azure Usage Records" : "External Factors Records"}
          </h2>
          <span className="text-sm text-gray-400">{data.length} rows</span>
        </div>
        <div className="overflow-x-auto">
          {data.length === 0 ? (
            <div className="p-6 text-gray-400">No data available.</div>
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
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-800">
                    {columns.map((key) => (
                      <td key={key} className="px-4 py-3 whitespace-nowrap">
                        {row[key] ?? ""}
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

export default RawData;
