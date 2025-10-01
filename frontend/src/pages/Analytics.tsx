import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from "recharts";
import type { PieLabelRenderProps } from "recharts/types/polar/Pie";

// --- TypeScript interfaces ---
interface AzureDataRow {
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

interface PieData {
  name: string;
  value: number;
}

interface UsageTrendData {
  date: string;
  usage_cpu: number;
}

interface RegionalPerformanceData {
  region: string;
  total_cpu: number;
}

interface RegionalUsageDistributionData {
  region: string;
  [resourceType: string]: number | string;
}

const COLORS = ["#38bdf8", "#34d399", "#facc15", "#f97316", "#a855f7", "#f472b6"];
const tooltipStyles = {
  backgroundColor: "#0f172acc",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: 12,
  fontSize: 12,
  padding: 12
};
const tooltipLabelStyle = { color: "#e2e8f0", fontWeight: 500 };
const tooltipItemStyle = { color: "#bae6fd" };
const RADIAN = Math.PI / 180;
const renderPieLabel = (props: PieLabelRenderProps) => {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent,
    name
  } = props;

  const labelPercent = typeof percent === "number" ? percent : Number(percent) || 0;
  const centerX = Number(cx) || 0;
  const centerY = Number(cy) || 0;
  const inner = Number(innerRadius) || 0;
  const outer = Number(outerRadius) || 0;
  const angle = typeof midAngle === "number" ? midAngle : Number(midAngle) || 0;
  const radius = inner + (outer - inner) * 0.65;
  const x = centerX + radius * Math.cos(-angle * RADIAN);
  const y = centerY + radius * Math.sin(-angle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#e2e8f0"
      fontSize={13}
      fontWeight={600}
      textAnchor={x >= centerX ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${name ?? ""} ${(labelPercent * 100).toFixed(0)}%`}
    </text>
  );
};

const Analytics: React.FC = () => {
  const [data, setData] = useState<AzureDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/analytics-data")
      .then(res => res.json())
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load analytics data");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>{error}</div>;

  // --- 1️⃣ Usage Trends Over Time ---
  const usageTrendData: UsageTrendData[] = Object.values(
    data.reduce((acc: Record<string, UsageTrendData>, row) => {
      if (!acc[row.date]) acc[row.date] = { date: row.date, usage_cpu: 0 };
      acc[row.date].usage_cpu += Number(row.usage_cpu);
      return acc;
    }, {} as Record<string, UsageTrendData>)
  );

  // --- 2️⃣ Resource Type Breakdown ---
  const resourceTypeCounts: PieData[] = Object.values(
    data.reduce((acc: Record<string, PieData>, row) => {
      if (!acc[row.resource_type]) acc[row.resource_type] = { name: row.resource_type, value: 0 };
      acc[row.resource_type].value += 1;
      return acc;
    }, {} as Record<string, PieData>)
  );

  // --- 3️⃣ Regional Performance ---
  const regionalPerformance: RegionalPerformanceData[] = Object.values(
    data.reduce((acc: Record<string, RegionalPerformanceData>, row) => {
      if (!acc[row.region]) acc[row.region] = { region: row.region, total_cpu: 0 };
      acc[row.region].total_cpu += Number(row.usage_cpu);
      return acc;
    }, {} as Record<string, RegionalPerformanceData>)
  );

  // --- 4️⃣ Regional Usage Distribution ---
  const regions = Array.from(new Set(data.map(row => row.region)));
  const resourceTypes = Array.from(new Set(data.map(row => row.resource_type)));
  const regionalUsageDistribution: RegionalUsageDistributionData[] = regions.map(region => {
    const entry: RegionalUsageDistributionData = { region };
    resourceTypes.forEach(type => {
      const total = data
        .filter(row => row.region === region && row.resource_type === type)
        .reduce((sum, row) => sum + Number(row.usage_cpu), 0);
      entry[type] = total;
    });
    return entry;
  });

  const cardBase =
    "bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950/60 border border-white/5 rounded-2xl shadow-2xl px-6 py-5 flex flex-col gap-5";
  const sectionBadge =
    "text-xs uppercase tracking-widest font-semibold px-3 py-1 rounded-full bg-white/5 text-sky-300 shrink-0";
  const axisStyle = { stroke: "#475569" };
  const tickStyle = { fill: "#cbd5f5", fontSize: 12 };

  return (
    <div className="p-6 space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Usage Trends Over Time */}
        <section className={`${cardBase} min-h-[360px]`}>        
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Usage Trends Over Time</h3>
              <p className="text-sm text-slate-300/80 mt-1">Aggregate CPU utilisation across all Azure regions</p>
            </div>
            <span className={sectionBadge}>Trend</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageTrendData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" />
                <XAxis dataKey="date" stroke={axisStyle.stroke} tick={tickStyle} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStyle.stroke} tick={tickStyle} tickLine={false} axisLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyles} cursor={{ stroke: "#38bdf8", strokeWidth: 1 }} />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
                <Line
                  type="monotone"
                  dataKey="usage_cpu"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#38bdf8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Resource Type Breakdown */}
        <section className={`${cardBase} min-h-[360px]`}>        
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Azure Resource Type Breakdown</h3>
              <p className="text-sm text-slate-300/80 mt-1">Share of total records contributed by each resource</p>
            </div>
            <span className={`${sectionBadge} text-fuchsia-300 bg-fuchsia-500/10`}>Mix</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resourceTypeCounts as { name: string; value: number }[]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="80%"
                  paddingAngle={6}
                  cornerRadius={8}
                  stroke="#0f172a"
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {resourceTypeCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyles} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Regional Performance */}
        <section className={`${cardBase} min-h-[360px]`}>        
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Azure Regional Performance</h3>
              <p className="text-sm text-slate-300/80 mt-1">Total CPU consumption by geography</p>
            </div>
            <span className={`${sectionBadge} text-emerald-300 bg-emerald-500/10`}>Performance</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="region" stroke={axisStyle.stroke} tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis stroke={axisStyle.stroke} tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyles} />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
                <Bar dataKey="total_cpu" fill="#34d399" radius={[14, 14, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Regional Usage Distribution */}
        <section className={`${cardBase} min-h-[360px]`}>        
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Regional Usage Distribution</h3>
              <p className="text-sm text-slate-300/80 mt-1">Relative CPU usage mix by resource type and region</p>
            </div>
            <span className={`${sectionBadge} text-amber-300 bg-amber-500/10`}>Distribution</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalUsageDistribution} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="region" stroke={axisStyle.stroke} tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis stroke={axisStyle.stroke} tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                <Tooltip contentStyle={tooltipStyles} formatter={(value: number) => `${value.toFixed(0)} CPU`} />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
                {resourceTypes.map((type, idx) => (
                  <Bar key={type} dataKey={type} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Analytics;
