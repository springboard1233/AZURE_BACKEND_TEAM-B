import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Cpu,
  HardDrive,
  Users,
  Database,
  CalendarDays,
  Globe2,
  ChevronDown
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

interface MergedRecord {
  date: string;
  region: string;
  resource_type: string;
  usage_cpu: string;
  usage_storage: string;
  users_active: string;
}

const periodOptions = [
  { label: "All Months", value: "all" },
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" }
];

const cardBase =
  "bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950/70 border border-white/5 rounded-2xl shadow-xl px-6 py-5 flex items-center gap-4 transition-all duration-300 ease-out transform";

type Accent = "sky" | "emerald";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectProps {
  label: string;
  icon: LucideIcon;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  accent: Accent;
}

const accentStyles: Record<Accent, { ring: string; hoverBorder: string; listShadow: string; hoverBg: string; activeBg: string }>= {
  sky: {
    ring: "focus:ring-sky-500/60",
    hoverBorder: "hover:border-sky-400/40",
    listShadow: "shadow-[0_25px_55px_-25px_rgba(56,189,248,0.65)]",
    hoverBg: "hover:bg-sky-500/10",
    activeBg: "bg-sky-500/15 text-sky-100"
  },
  emerald: {
    ring: "focus:ring-emerald-500/60",
    hoverBorder: "hover:border-emerald-400/40",
    listShadow: "shadow-[0_25px_55px_-25px_rgba(16,185,129,0.55)]",
    hoverBg: "hover:bg-emerald-500/10",
    activeBg: "bg-emerald-500/15 text-emerald-50"
  }
};

const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  accent
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOption = options.find((option) => option.value === value);
  const styles = accentStyles[accent];

  return (
    <div ref={containerRef} className="relative min-w-[200px] text-xs text-slate-300/80">
      <span className="uppercase tracking-wide text-slate-400 flex items-center gap-2 mb-1">
        <Icon size={14} className={accent === "sky" ? "text-sky-300" : "text-emerald-300"} />
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 flex items-center justify-between gap-3 focus:outline-none transition-all duration-200 ${styles.ring} ${styles.hoverBorder}`}
      >
        <span className="truncate">{selectedOption?.label ?? "Select"}</span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
      {open && (
        <ul
          className={`absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur ${styles.listShadow}`}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-all duration-200 flex items-center justify-between text-slate-100 ${isActive ? styles.activeBg : ""} ${styles.hoverBg}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isActive && <span className="text-xs uppercase tracking-wide">Active</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

interface UsageTrendPoint {
  date: string;
  usage_cpu: number;
}

interface RegionalUsageSlice {
  name: string;
  value: number;
  color: string;
  percent: number;
  [key: string]: string | number;
}

type PieTooltipEntry = {
  value?: ValueType;
  name?: NameType;
};

type PieTooltipProps = {
  active?: boolean;
  payload?: PieTooltipEntry[];
  label?: NameType;
};

const OVERVIEW_COLORS = ["#38bdf8", "#6366f1", "#ec4899", "#f97316", "#22c55e", "#a855f7", "#facc15", "#14b8a6"];

const overviewTooltipStyles = {
  backgroundColor: "rgba(15, 23, 42, 0.96)",
  border: "1px solid rgba(96, 165, 250, 0.45)",
  borderRadius: 18,
  fontSize: 12,
  padding: 14,
  boxShadow: "0 30px 75px -40px rgba(14, 165, 233, 0.55)",
  color: "#e2e8f0"
};

const Overview: React.FC = () => {
  const [data, setData] = useState<MergedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/merged-data")
      .then((res) => res.json())
      .then((res) => {
        setData(res.data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load overview metrics");
        setLoading(false);
      });
  }, []);

  const regions = useMemo(() => {
    const unique = Array.from(new Set(data?.map((row) => row.region))).sort();
    return ["all", ...unique];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const rowDate = new Date(row.date);
      const month = rowDate.getMonth() + 1; // 1-based
      const matchesMonth =
        selectedPeriod === "all" || Number(selectedPeriod) === month;
      const matchesRegion = selectedRegion === "all" || row.region === selectedRegion;
      return matchesMonth && matchesRegion;
    });
  }, [data, selectedPeriod, selectedRegion]);

  const metrics = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalRecords: 0,
        avgCpu: 0,
        avgStorage: 0,
        totalActiveUsers: 0
      };
    }

    const totals = filteredData.reduce(
      (acc, row) => {
        const cpu = Number(row.usage_cpu) || 0;
        const storage = Number(row.usage_storage) || 0;
        const users = Number(row.users_active) || 0;
        acc.cpu += cpu;
        acc.storage += storage;
        acc.users += users;
        return acc;
      },
      { cpu: 0, storage: 0, users: 0 }
    );

    const totalRecords = filteredData.length;
    return {
      totalRecords,
      avgCpu: totals.cpu / totalRecords,
      avgStorage: totals.storage / totalRecords,
      totalActiveUsers: totals.users
    };
  }, [filteredData]);

  const usageTrend: UsageTrendPoint[] = useMemo(() => {
    const grouped = filteredData.reduce<Record<string, UsageTrendPoint>>((acc, row) => {
      if (!acc[row.date]) {
        acc[row.date] = { date: row.date, usage_cpu: 0 };
      }
      acc[row.date].usage_cpu += Number(row.usage_cpu) || 0;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData]);

  const regionalUsageDistribution: RegionalUsageSlice[] = useMemo(() => {
    const totals = filteredData.reduce<Record<string, number>>((acc, row) => {
      const region = row.region || "Unknown";
      if (!acc[region]) acc[region] = 0;
      acc[region] += Number(row.usage_cpu) || 0;
      return acc;
    }, {});

    const totalUsage = Object.values(totals).reduce((sum, value) => sum + value, 0);

    return Object.entries(totals).map(([region, value], index) => ({
      name: region,
      value,
      color: OVERVIEW_COLORS[index % OVERVIEW_COLORS.length],
      percent: totalUsage ? value / totalUsage : 0
    }));
  }, [filteredData]);

  const pieTooltip = ({ active, payload, label }: PieTooltipProps) => {
    if (!active || !payload?.length) return null;
    const rawValue = Number(payload[0]?.value) || 0;
    const matchingSlice = regionalUsageDistribution.find((slice) => slice.name === label);
    const percentDisplay = matchingSlice ? (matchingSlice.percent * 100).toFixed(1) : "0.0";
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-lg">
        <div className="font-semibold text-slate-100">{label}</div>
        <div className="mt-1 text-slate-300">CPU Usage: {rawValue.toLocaleString()}</div>
        <div className="text-slate-400 mt-1">Share: {percentDisplay}%</div>
      </div>
    );
  };

  const formatNumber = (value: number, fractionDigits = 1) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits
    }).format(value);

  if (loading) {
    return <div className="p-6 text-white">Loading metrics...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <header className="flex flex-col gap-3 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/40 border border-white/5 rounded-3xl px-8 py-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Azure Analytics Dashboard</h1>
            <p className="text-slate-300/85 mt-2">
              Real-time insight into usage efficiency, resource consumption, and user activity across Azure regions.
            </p>
          </div>
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Data
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5 mt-4">
          <div className="text-xs uppercase tracking-widest text-sky-300 font-semibold flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-300" /> Smart Filters
            </span>
          </div>
          <div className="flex flex-wrap gap-4 w-full sm:w-auto">
            <label className="flex flex-col gap-1 text-slate-300/80 text-xs min-w-[180px]">
              <span className="uppercase tracking-wide text-slate-400 flex items-center gap-2">
                <CalendarDays size={14} className="text-sky-300" /> Period
              </span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition-all hover:border-sky-400/40"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-slate-300/80 text-xs min-w-[200px]">
              <span className="uppercase tracking-wide text-slate-400 flex items-center gap-2">
                <Globe2 size={14} className="text-emerald-300" /> Region
              </span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 transition-all hover:border-emerald-400/40"
              >
                {regions.map((regionValue) => (
                  <option key={regionValue} value={regionValue}>
                    {regionValue === "all" ? "All Regions" : regionValue}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <article className={`${cardBase} hover:border-sky-400/40 hover:-translate-y-1 hover:shadow-[0_30px_55px_-30px_rgba(56,189,248,0.75)]`}> 
          <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 border border-sky-500/20">
            <Database size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-slate-400">Total Usage Records</p>
            <h3 className="text-2xl font-semibold text-white">
              {metrics.totalRecords.toLocaleString("en-US")}
            </h3>
            <p className="text-sm text-slate-400">All resource types</p>
          </div>
        </article>

        <article className={`${cardBase} hover:border-fuchsia-400/40 hover:-translate-y-1 hover:shadow-[0_30px_55px_-30px_rgba(217,70,239,0.6)]`}>
          <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20">
            <Cpu size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-slate-400">Average CPU Usage</p>
            <h3 className="text-2xl font-semibold text-white">
              {formatNumber(metrics.avgCpu)}
            </h3>
            <p className="text-sm text-slate-400">Aggregate across selection</p>
          </div>
        </article>

        <article className={`${cardBase} hover:border-amber-400/40 hover:-translate-y-1 hover:shadow-[0_30px_55px_-30px_rgba(251,191,36,0.5)]`}>
          <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/20">
            <HardDrive size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-slate-400">Average Storage Usage</p>
            <h3 className="text-2xl font-semibold text-white">
              {formatNumber(metrics.avgStorage)}
            </h3>
            <p className="text-sm text-slate-400">Storage consumption (GB)</p>
          </div>
        </article>

        <article className={`${cardBase} hover:border-emerald-400/40 hover:-translate-y-1 hover:shadow-[0_30px_55px_-30px_rgba(16,185,129,0.6)]`}>
          <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
            <Users size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-slate-400">Total Active Users</p>
            <h3 className="text-2xl font-semibold text-white">
              {metrics.totalActiveUsers.toLocaleString("en-US")}
            </h3>
            <p className="text-sm text-slate-400">Across selected regions</p>
          </div>
        </article>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_42px_85px_-48px_rgba(56,189,248,0.35)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Usage Trends Over Time</h2>
              <p className="mt-1 text-sm text-slate-300/80">CPU utilisation aligned with current filters</p>
            </div>
            <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">Trend</span>
          </div>
          <div className="mt-6 h-[320px]">
            {usageTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageTrend}>
                  <defs>
                    <linearGradient id="overviewTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} tickLine={false} axisLine={false} width={72} />
                  <Tooltip contentStyle={overviewTooltipStyles} formatter={(value: number) => [`${formatNumber(value)} CPU`, "Usage"]} />
                  <Area type="monotone" dataKey="usage_cpu" stroke="#38bdf8" strokeWidth={2.2} fill="url(#overviewTrend)" activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No data for the selected filters.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_42px_85px_-48px_rgba(249,115,22,0.35)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Regional Resource Distribution</h2>
              <p className="mt-1 text-sm text-slate-300/80">CPU share by region and resource type</p>
            </div>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">Distribution</span>
          </div>
          <div className="mt-6 h-[320px]">
            {regionalUsageDistribution.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionalUsageDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="78%"
                    paddingAngle={6}
                    cornerRadius={18}
                    stroke="#0f172a"
                    strokeWidth={1.3}
                    label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {regionalUsageDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color} stroke={entry.color} opacity={0.92 - index * 0.02} />
                    ))}
                  </Pie>
                  <Tooltip content={pieTooltip} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ color: "#e2e8f0", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No resource distribution data.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Overview;

