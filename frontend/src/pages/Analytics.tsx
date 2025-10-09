import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from "react";
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
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
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
  [key: string]: string | number;
}
interface UsageTrendData {
  date: string;
  usage_cpu: number;
}
interface RegionalPerformanceData {
  region: string;
  total_cpu: number;
  [key: string]: string | number;
}

const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

const formatNumberWithDecimals = (value: number, decimals = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);

const COLORS = ["#ef4444", "#f97316", "#22c55e", "#2563eb", "#facc15", "#14b8a6", "#f472b6", "#a855f7"];

const tooltipStyles = {
  backgroundColor: "rgba(2, 6, 23, 0.96)",
  border: "1px solid rgba(239, 68, 68, 0.45)",
  borderRadius: 18,
  fontSize: 13,
  padding: 16,
  boxShadow: "0 28px 65px -28px rgba(239, 68, 68, 0.55)",
  color: "#e2e8f0"
};
const tooltipLabelStyle = { color: "#f8fafc", fontWeight: 600 };
const tooltipItemStyle = { color: "#e0f2fe", fontWeight: 500 };

const RADIAN = Math.PI / 180;
const renderPieLabel = (props: PieLabelRenderProps) => {
  const labelPercent = typeof props.percent === "number" ? props.percent : Number(props.percent) || 0;
  const centerX = Number(props.cx) || 0;
  const centerY = Number(props.cy) || 0;
  const inner = Number(props.innerRadius) || 0;
  const outer = Number(props.outerRadius) || 0;
  const angle = Number(props.midAngle) || 0;
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
      {`${props.name ?? ""} ${(labelPercent * 100).toFixed(0)}%`}
    </text>
  );
};

type FilterOption = {
  label: string;
  value: string;
};

type RegionalDistributionEntry = {
  region: string;
  total_cpu: number;
  percent: number;
  color: string;
  [key: string]: string | number;
};

interface AnalyticsFilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  accent?: "purple" | "sky";
}

const analyticsAccent = {
  purple: {
    dot: "bg-purple-300",
    border: "border-purple-400/40",
    focus: "focus:ring-purple-500/40",
    hover: "hover:bg-purple-500/15",
    caret: "text-purple-200",
  },
  sky: {
    dot: "bg-sky-300",
    border: "border-sky-400/40",
    focus: "focus:ring-sky-500/40",
    hover: "hover:bg-sky-500/15",
    caret: "text-sky-200",
  },
};

const AnalyticsFilterDropdown: React.FC<AnalyticsFilterDropdownProps> = ({ label, value, options, onChange, accent = "purple" }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const accentTheme = analyticsAccent[accent];
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div ref={wrapperRef} className="relative min-w-[172px]">
      <span className="stellar-label text-[10px] text-slate-400">{label}</span>
      <button
        type="button"
        className={`group mt-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-100 transition focus:outline-none focus:ring-2 ${accentTheme.focus} ${accentTheme.hover}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""} ${accentTheme.caret}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-[1000] max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-1 shadow-[0_22px_55px_-35px_rgba(99,102,241,0.65)] backdrop-blur"
          style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  isActive ? "bg-white/12 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isActive && <span className={`h-2.5 w-2.5 rounded-full ${accentTheme.dot}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Analytics: React.FC = () => {
  const [data, setData] = useState<AzureDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>("All Regions");
  const [resourceFilter, setResourceFilter] = useState<string>("All Types");
  const [activeRegionIndex, setActiveRegionIndex] = useState<number | null>(null);
  const [activeResourceIndex, setActiveResourceIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/analytics-data")
      .then(res => res.json())
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load analytics data");
        setLoading(false);
      });
  }, []);

  const regionOptions = useMemo<FilterOption[]>(() => {
    const unique = Array.from(new Set(data.map((row) => row.region))).filter(Boolean);
    return [{ label: "All Regions", value: "All Regions" }, ...unique.map((region) => ({ label: region, value: region }))];
  }, [data]);

  const resourceOptions = useMemo<FilterOption[]>(() => {
    const unique = Array.from(new Set(data.map((row) => row.resource_type))).filter(Boolean);
    return [{ label: "All Types", value: "All Types" }, ...unique.map((type) => ({ label: type, value: type }))];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchRegion = regionFilter === "All Regions" || row.region === regionFilter;
      const matchResource = resourceFilter === "All Types" || row.resource_type === resourceFilter;
      return matchRegion && matchResource;
    });
  }, [data, regionFilter, resourceFilter]);

  const usageTrendData: UsageTrendData[] = useMemo(() => {
    const aggregated = filteredData.reduce((acc: Record<string, UsageTrendData>, row) => {
      if (!acc[row.date]) acc[row.date] = { date: row.date, usage_cpu: 0 };
      acc[row.date].usage_cpu += Number(row.usage_cpu);
      return acc;
    }, {});
    return Object.values(aggregated).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData]);

  const resourceTypeCounts: PieData[] = useMemo(() => {
    const aggregated = filteredData.reduce((acc: Record<string, PieData>, row) => {
      if (!acc[row.resource_type]) acc[row.resource_type] = { name: row.resource_type, value: 0 };
      acc[row.resource_type].value += 1;
      return acc;
    }, {});
    return Object.values(aggregated);
  }, [filteredData]);

  const resourceLegend = useMemo(() => {
    return resourceTypeCounts.map((entry, index) => ({
      label: entry.name,
      value: entry.value,
      color: COLORS[index % COLORS.length],
      id: `resource-${entry.name?.toString().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || index}`,
    }));
  }, [resourceTypeCounts]);

  const regionalPerformance: RegionalPerformanceData[] = useMemo(() => {
    const aggregated = filteredData.reduce((acc: Record<string, RegionalPerformanceData>, row) => {
      if (!acc[row.region]) acc[row.region] = { region: row.region, total_cpu: 0 };
      acc[row.region].total_cpu += Number(row.usage_cpu);
      return acc;
    }, {});
    return Object.values(aggregated).sort((a, b) => b.total_cpu - a.total_cpu);
  }, [filteredData]);

  const regionalDistribution = useMemo<RegionalDistributionEntry[]>(() => {
    if (!regionalPerformance.length) return [];
    const total = regionalPerformance.reduce((sum, entry) => sum + entry.total_cpu, 0);
    return regionalPerformance.map((entry, index) => ({
      region: entry.region,
      total_cpu: entry.total_cpu,
      percent: total ? entry.total_cpu / total : 0,
      color: COLORS[index % COLORS.length],
    }));
  }, [regionalPerformance]);

  const activeRegion = useMemo(() => {
    if (!regionalDistribution.length) return null;
    if (activeRegionIndex !== null && regionalDistribution[activeRegionIndex]) {
      return regionalDistribution[activeRegionIndex];
    }
    return regionalDistribution[0];
  }, [regionalDistribution, activeRegionIndex]);

  const handleRegionEnter = useCallback((_: unknown, index: number) => {
    setActiveRegionIndex(index);
  }, []);

  const handleRegionLeave = useCallback(() => {
    setActiveRegionIndex(null);
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-300">Loading analytics...</div>;
  if (error) return <div className="p-10 text-center text-rose-300">{error}</div>;

  const cardBase =
    "relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-slate-950/75 px-7 py-6 shadow-[0_32px_85px_-48px_rgba(129,140,248,0.65)] backdrop-blur";
  const sectionBadge =
    "text-xs uppercase tracking-widest font-semibold px-3 py-1 rounded-full bg-white/5 text-sky-300 shrink-0";
  const axisStyle = { stroke: "#475569" };
  const tickStyle = { fill: "#cbd5f5", fontSize: 12 };

  return (
    <div className="space-y-10 bg-transparent px-6 py-10 text-slate-100">
      <header className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-purple-600/25 via-slate-900/85 to-slate-950/95 p-8 shadow-[0_42px_95px_-50px_rgba(168,85,247,0.55)]">
        <div className="absolute inset-0 opacity-80">
          <div className="absolute -left-32 -top-24 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute right-16 top-24 h-60 w-60 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-[0.35rem] text-purple-200">AzureForge Analytics Suite</span>
              <h1 className="mt-3 text-4xl font-semibold text-slate-50">Real-time Azure Analytics</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300/85">
                Explore CPU usage, regional splits, and resource efficiency with immersive, interactive visualisations powered by live Azure demand signals.
              </p>
            </div>
            <div className="flex gap-3">
              <AnalyticsFilterDropdown label="Region" value={regionFilter} options={regionOptions} onChange={setRegionFilter} accent="purple" />
              <AnalyticsFilterDropdown label="Resource" value={resourceFilter} options={resourceOptions} onChange={setResourceFilter} accent="sky" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <span className="uppercase tracking-[0.35rem] text-slate-500">Records</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-slate-100">
              {(filteredData.length || 0).toLocaleString()} filtered rows
            </span>
            <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-emerald-200">Live</span>
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Usage Trends Over Time */}
        <section className={`${cardBase} min-h-[380px]`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Usage Trends Over Time</h3>
              <p className="mt-1 text-sm text-slate-300/80">Aggregate CPU utilisation across all Azure regions</p>
            </div>
            <span className={`${sectionBadge} text-purple-300 bg-purple-500/15`}>Trend</span>
          </div>
          <div className="relative h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageTrendData}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="90%" stopColor="#38bdf8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="#1e293b" />
                <XAxis dataKey="date" stroke={axisStyle.stroke} tick={tickStyle} tickLine={false} axisLine={false} minTickGap={32} />
                <YAxis stroke={axisStyle.stroke} tick={tickStyle} tickLine={false} axisLine={false} width={72} />
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                <Tooltip contentStyle={tooltipStyles} cursor={{ stroke: "#38bdf8", strokeWidth: 1 }} labelFormatter={formatDateLabel} />
                <Area
                  type="monotone"
                  dataKey="usage_cpu"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cpuGradient)"
                  activeDot={{ r: 7, strokeWidth: 0, fill: "#f0f9ff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Resource Type Breakdown */}
        <section className={`${cardBase} min-h-[380px]`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Azure Resource Type Breakdown</h3>
              <p className="mt-1 text-sm text-slate-300/80">Share of total records contributed by each resource</p>
            </div>
            <span className={`${sectionBadge} text-fuchsia-300 bg-fuchsia-500/10`}>Mix</span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {resourceLegend.map((entry) => (
                    <radialGradient key={entry.id} id={entry.id} cx="50%" cy="50%" r="80%">
                      <stop offset="6%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="60%" stopColor={entry.color} stopOpacity={0.82} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.35} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie
                  data={resourceTypeCounts as { name: string; value: number }[]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="46%"
                  outerRadius="82%"
                  paddingAngle={12}
                  cornerRadius={26}
                  stroke="#020617"
                  strokeWidth={1.6}
                  label={renderPieLabel}
                  labelLine={false}
                  onMouseEnter={(_, index) => setActiveResourceIndex(index)}
                  onMouseLeave={() => setActiveResourceIndex(null)}
                >
                  {resourceLegend.map((entry, index) => (
                    <Cell
                      key={`resource-cell-${entry.id}`}
                      fill={`url(#${entry.id})`}
                      stroke={entry.color}
                      strokeWidth={activeResourceIndex === index ? 2.2 : 1.4}
                      opacity={activeResourceIndex === null || activeResourceIndex === index ? 1 : 0.25}
                      style={{ transition: "all 180ms ease" }}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyles} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {resourceLegend.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-200">
              {resourceLegend.map((entry, index) => {
                const active = activeResourceIndex === index;
                return (
                  <span
                    key={entry.id}
                    className={`flex items-center gap-2 rounded-full border border-white/12 px-3 py-1 backdrop-blur transition ${
                      active ? "bg-white/20 text-white scale-[1.05]" : "bg-white/10 hover:bg-white/15"
                    }`}
                    style={{ boxShadow: `0 20px 40px -24px ${entry.color}` }}
                  >
                    <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                    {entry.label}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        {/* Regional Performance */}
        <section className={`${cardBase} min-h-[380px]`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Azure Regional Performance</h3>
              <p className="mt-1 text-sm text-slate-300/80">Total CPU consumption by geography</p>
            </div>
            <span className={`${sectionBadge} text-emerald-300 bg-emerald-500/10`}>Performance</span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalPerformance} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="region" stroke={axisStyle.stroke} tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis stroke={axisStyle.stroke} tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyles}
                  formatter={(value: number) => [`${formatNumberWithDecimals(Number(value))} CPU`, "Total"]}
                  labelFormatter={(label) => `Region: ${label}`}
                />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
                <Bar dataKey="total_cpu" fill="#34d399" radius={[18, 18, 6, 6]}>
                  {regionalPerformance.map((entry, index) => (
                    <Cell key={entry.region} fill={`rgba(52, 211, 153, ${0.55 + (index / Math.max(regionalPerformance.length, 1)) * 0.35})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Regional Usage Distribution */}
        <section className={`${cardBase} min-h-[380px]`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Regional Usage Distribution</h3>
              <p className="mt-1 text-sm text-slate-300/80">Share of CPU demand across Azure regions</p>
            </div>
            <span className={`${sectionBadge} text-amber-300 bg-amber-500/10`}>Distribution</span>
          </div>

          {regionalDistribution.length ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {regionalDistribution.map((entry, index) => {
                        const gradientId = `region-gradient-${entry.region.replace(/\s+/g, "-").toLowerCase()}`;
                        return (
                          <radialGradient key={gradientId} id={gradientId} cx="50%" cy="50%" r="78%">
                            <stop offset="5%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="60%" stopColor={entry.color} stopOpacity={0.82} />
                            <stop offset="97%" stopColor={entry.color} stopOpacity={0.32} />
                          </radialGradient>
                        );
                      })}
                    </defs>
                    <Pie
                      data={regionalDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius="42%"
                      outerRadius="78%"
                      paddingAngle={12}
                      cornerRadius={24}
                      dataKey="total_cpu"
                      nameKey="region"
                      stroke="#020617"
                      strokeWidth={1.4}
                      onMouseEnter={handleRegionEnter}
                      onMouseLeave={handleRegionLeave}
                    >
                      {regionalDistribution.map((entry, index) => {
                        const gradientId = `region-gradient-${entry.region.replace(/\s+/g, "-").toLowerCase()}`;
                        return (
                          <Cell
                            key={gradientId}
                            fill={`url(#${gradientId})`}
                            stroke={entry.color}
                            strokeWidth={activeRegionIndex === index ? 2.2 : 1.4}
                            opacity={activeRegionIndex === null || activeRegionIndex === index ? 1 : 0.35}
                            style={{ transition: "all 160ms ease" }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyles}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                      formatter={(value: number, _name, _info, index) => {
                        const entry = typeof index === "number" ? regionalDistribution[index] : undefined;
                        const percent = entry?.percent ?? 0;
                        return [`${formatNumberWithDecimals(Number(value))} CPU`, `${(percent * 100).toFixed(1)}% share`];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col justify-center rounded-[1.75rem] border border-white/10 bg-white/10 px-6 py-8 backdrop-blur">
                {activeRegion ? (
                  <>
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Region</span>
                    <span className="mt-1 text-lg font-semibold text-white">{activeRegion.region}</span>
                    <span className="mt-4 text-sm text-slate-300/85">Share of total CPU demand</span>
                    <span className="mt-2 text-3xl font-semibold text-amber-200">{(activeRegion.percent * 100).toFixed(1)}%</span>
                    <span className="mt-4 text-xs text-slate-400/80">Total CPU</span>
                    <span className="text-lg font-semibold text-white">{formatNumberWithDecimals(activeRegion.total_cpu)}</span>
                  </>
                ) : (
                  <div className="text-sm text-slate-400">No regional data available.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
              Regional distribution data will appear once analytics data is loaded.
            </div>
          )}

          {regionalDistribution.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-200">
              {regionalDistribution.map((entry, index) => {
                const isActive = activeRegion ? activeRegion.region === entry.region : index === 0;
                return (
                  <button
                    key={`region-chip-${entry.region}`}
                    type="button"
                    className={`flex items-center gap-2 rounded-full border border-white/12 px-3 py-1 backdrop-blur transition ${
                      isActive ? "scale-[1.05] bg-white/20 text-white" : "bg-white/10 text-slate-200 hover:bg-white/15"
                    }`}
                    style={{ boxShadow: `0 20px 40px -24px ${entry.color}` }}
                    onMouseEnter={() => setActiveRegionIndex(index)}
                    onFocus={() => setActiveRegionIndex(index)}
                    onMouseLeave={handleRegionLeave}
                  >
                    <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                    {entry.region}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Analytics;


