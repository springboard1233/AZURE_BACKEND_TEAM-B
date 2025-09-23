import React from "react";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const LineChart = ({ data, title, xAxisLabel, yAxisLabel }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ReLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" label={{ value: xAxisLabel, position: "insideBottom", offset: -5 }} />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="cpu_usage" stroke="#8884d8" />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;
