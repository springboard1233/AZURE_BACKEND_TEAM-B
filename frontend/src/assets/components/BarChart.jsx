import React from "react";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const BarChart = ({ data, title, xAxisLabel, yAxisLabel }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ReBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="region" label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }} />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="usage_storage" fill="#82ca9d" />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
