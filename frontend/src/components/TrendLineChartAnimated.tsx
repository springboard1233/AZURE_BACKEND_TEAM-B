import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface ChartProps {
  data: Array<Record<string, unknown>>;
  title: string;
  series: ChartSeries[];
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);

const TrendLineChartAnimated: React.FC<ChartProps> = ({ data, title, series }) => {
  const sanitizedSeries = series.filter((entry) => entry.key);

  const preparedData = useMemo(() => {
    if (!data || !data.length) return [];
    return data.map((row) => {
      const next: Record<string, unknown> = { ...row };
      sanitizedSeries.forEach((entry) => {
        const raw = row[entry.key];
        const numeric = typeof raw === "number" ? raw : Number(raw) || 0;
        next[entry.key] = Number.isFinite(numeric) ? numeric : 0;
      });
      return next;
    });
  }, [data, sanitizedSeries]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-3 text-xs text-slate-300/80">
          {sanitizedSeries.map((entry) => (
            <span key={entry.key} className="flex items-center gap-1 uppercase tracking-widest">
              <span
                className="inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={preparedData} margin={{ top: 24, right: 20, left: 12, bottom: 20 }}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.95} />
                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1f2937" strokeDasharray="4 6" />
            <XAxis
              dataKey="date"
              tickMargin={12}
              stroke="#9ca3af"
              tickLine={false}
              axisLine={{ stroke: "#374151" }}
              minTickGap={24}
            />
            <YAxis
              stroke="#9ca3af"
              tickFormatter={(value) => formatNumber(Number(value))}
              tick={{ fill: "#d1d5db", fontSize: 12 }}
              axisLine={{ stroke: "#374151" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                borderRadius: "1rem",
                border: "1px solid rgba(148, 163, 184, 0.35)",
                color: "#e2e8f0",
                padding: "12px 16px",
              }}
              labelStyle={{ color: "#38bdf8", fontWeight: 600 }}
              formatter={(value: number, name: string) => [formatNumber(Number(value)), name]}
            />
            <Legend wrapperStyle={{ color: "#cbd5f5" }} verticalAlign="top" height={32} />
            {sanitizedSeries.map((entry) => (
              <Line
                key={entry.key}
                type="monotone"
                dataKey={entry.key}
                stroke={entry.color}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={900}
                animationEasing="ease-out"
                strokeLinecap="round"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendLineChartAnimated;
