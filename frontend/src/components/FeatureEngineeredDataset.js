import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FeatureEngineeredDataset({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filters.startDate || !filters.endDate) return;

    setLoading(true);
    setError(null);

    axios.get('/api/features', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        region: filters.region,
      }
    }).then(res => {
      setData(res.data || []);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load feature engineered dataset');
      setLoading(false);
    });
  }, [filters]);

  if (loading) return <p>Loading feature-engineered dataset...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!data.length) return <p>No data available for selected filters.</p>;

  // Display first 10 columns for brevity
  const columns = Object.keys(data[0]).slice(0, 10);

  return (
    <div style={{ marginBottom: 30 }}>
      <h3>Feature-Engineered Dataset</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{ border: '1px solid #ddd', padding: 8, backgroundColor: '#f2f2f2' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {columns.map(col => (
                  <td key={col} style={{ border: '1px solid #ddd', padding: 8 }}>{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FeatureEngineeredDataset;