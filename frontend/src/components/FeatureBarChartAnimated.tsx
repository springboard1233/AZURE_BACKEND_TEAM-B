import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

interface FeatureBarChartProps {
  data: { feature: string; importance: number }[];
  title: string;
}

const palette = ["#38bdf8", "#22d3ee", "#c084fc", "#f472b6", "#f97316", "#facc15", "#22c55e"];

const FeatureBarChartAnimated: React.FC<FeatureBarChartProps> = ({ data, title }) => {
  const orderedData = useMemo(
    () => [...data].sort((a, b) => b.importance - a.importance).slice(0, 10),
    [data]
  );

  const [animatedData, setAnimatedData] = useState(orderedData);

  useEffect(() => {
    if (!orderedData.length) {
      setAnimatedData([]);
      return;
    }

    let animationFrame = 0;
    const duration = 600;
    const start = performance.now();

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedData(
        orderedData.map((item) => ({
          feature: item.feature,
          importance: Number((item.importance * eased).toFixed(3)),
        }))
      );
      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [orderedData]);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/80 p-6 shadow-[0_25px_65px_-30px_rgba(14,165,233,0.45)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-300/70 mt-1">Top correlated signals relative to CPU utilization.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Insights</span>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={animatedData} layout="vertical" barSize={24} margin={{ left: 36, right: 24, top: 12, bottom: 12 }}>
          <CartesianGrid horizontal={false} stroke="rgba(148, 163, 184, 0.12)" />
          <XAxis
            type="number"
            tickFormatter={(value) => formatPercentage(Number(value))}
            stroke="#94a3b8"
            tick={{ fill: "#cbd5f5", fontSize: 11 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.2)" }}
          />
          <YAxis
            dataKey="feature"
            type="category"
            width={160}
            interval={0}
            tick={{ fill: "#e2e8f0", fontSize: 12, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
            contentStyle={{
              background: "rgba(15, 23, 42, 0.94)",
              borderRadius: "1rem",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              color: "#f8fafc",
              padding: "12px 16px",
            }}
            labelStyle={{ color: "#38bdf8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}
            itemStyle={{ color: "#e2e8f0", fontWeight: 500, textTransform: "capitalize" }}
            formatter={(value: number) => [formatPercentage(Number(value)), "importance"]}
          />
          <Bar radius={[10, 10, 10, 10]} dataKey="importance">
            {animatedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FeatureBarChartAnimated;
