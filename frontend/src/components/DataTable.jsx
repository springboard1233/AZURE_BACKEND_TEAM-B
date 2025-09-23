// frontend/src/components/DataTable.jsx
import React from "react";

export default function DataTable({ rows = [], columns = [] }) {
  if (!rows || !rows.length) {
    return <div className="p-4 text-sm text-gray-500">No rows to display.</div>;
  }
  return (
    <div className="overflow-x-auto border rounded-2xl">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(c => <th key={c} className="text-left px-3 py-2 font-medium text-gray-600">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50/40"}>
              {columns.map(c => (
                <td key={c} className="px-3 py-2 whitespace-nowrap">{String(r[c] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
