import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  ReferenceLine
} from "recharts";
import { CalendarDays, MapPin, Layers } from "lucide-react";

interface FeatureRecord {
  date?: string | null;
  region?: string | null;
  resource_type?: string | null;
  usage_cpu?: number | string | null;
  usage_storage?: number | string | null;
  users_active?: number | string | null;
  [key: string]: string | number | null | undefined;
}

interface BaseRecord {
  date: string;
  region: string;
  resource_type: string;
  usage_cpu: string;
  usage_storage: string;
  users_active: string;
  [key: string]: string;
}

interface MetricSummary {
  averageCpu: number;
  averageStorage: number;
  totalUsers: number;
  records: number;
}

type TotalsAccumulator = {
  cpu: number;
  storage: number;
  users: number;
};
type MetricKey = "usage_cpu" | "usage_storage" | "users_active";

const engineeredMetricCandidates: Record<MetricKey, string[]> = {
  usage_cpu: ["rolling_mean_7", "rolling_mean_30", "lag_7", "lag_30", "lag_1"],
  usage_storage: ["storage_rolling_mean_7", "storage_rolling_mean_30", "rolling_mean_30", "rolling_mean_7"],
  users_active: ["users_active_rolling_mean_7", "users_active_trend", "lag_7", "lag_30"]
};

const getBaselineMetric = (row: FeatureRecord | BaseRecord, key: MetricKey): number => {
  const value = (row as FeatureRecord)[key];
  return toNumber(value as number | string | null | undefined);
};

const getEngineeredMetric = (row: FeatureRecord, key: MetricKey): number => {
  const fallback = getBaselineMetric(row, key);
  const candidates = engineeredMetricCandidates[key] ?? [];
  for (const candidate of candidates) {
    const candidateValue = row[candidate];
    if (candidateValue !== undefined && candidateValue !== null && candidateValue !== "") {
      return toNumber(candidateValue as number | string | null | undefined);
    }
  }
  return fallback;
};

interface ComparisonRow {
  date: string;
  beforeCpu: number;
  afterCpu: number;
  beforeStorage: number;
  afterStorage: number;
}

interface ResourceComparisonRow {
  resource: string;
  before: number;
  after: number;
}

interface RegionDeltaRow {
  region: string;
  delta: number;
  before: number;
  after: number;
}

const palette = [
  "#38bdf8",
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#facc15",
  "#14b8a6",
  "#f472b6",
  "#a855f7"
];

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const defaultMetrics: MetricSummary = {
  averageCpu: 0,
  averageStorage: 0,
  totalUsers: 0,
  records: 0
};

const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);

const formatDelta = (value: number) => {
  const formatted = formatNumber(Math.abs(value), 2);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

const Insights: React.FC = () => {
  const [featureRows, setFeatureRows] = useState<FeatureRecord[]>([]);
  const [baseRows, setBaseRows] = useState<BaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    const loadFeatureData = async () => {
      try {
        const response = await fetch("/data/feature_engineered.csv");
        if (!response.ok) throw new Error("Failed to load feature engineered data");
        const csv = await response.text();
        Papa.parse<FeatureRecord>(csv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (result) => {
            if (cancelled) return;
            const parsed = (result.data ?? []).filter((row) => row.date);
            setFeatureRows(parsed);
          },
          error: (err: Papa.ParseError | Error) => {
            if (cancelled) return;
            console.error(err);
            setError("Unable to parse feature engineered data");
          }
        });
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Unable to load feature engineered data");
      }
    };

    const loadBaseData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/merged-data");
        if (!response.ok) throw new Error("Failed to load baseline data");
        const json = await response.json();
        if (!cancelled) {
          setBaseRows(Array.isArray(json.data) ? json.data : []);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Unable to load baseline data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFeatureData().then(loadBaseData);

    return () => {
      cancelled = true;
    };
  }, []);

  const regions = useMemo(() => {
    const set = new Set<string>();
    featureRows.forEach((row) => {
      if (row.region) set.add(String(row.region));
    });
    baseRows.forEach((row) => {
      if (row.region) set.add(String(row.region));
    });
    return ["all", ...Array.from(set).sort()];
  }, [featureRows, baseRows]);

  const resources = useMemo(() => {
    const set = new Set<string>();
    featureRows.forEach((row) => {
      if (row.resource_type) set.add(String(row.resource_type));
    });
    baseRows.forEach((row) => {
      if (row.resource_type) set.add(String(row.resource_type));
    });
    return ["all", ...Array.from(set).sort()];
  }, [featureRows, baseRows]);

  const applyFilters = <T extends FeatureRecord | BaseRecord>(rows: T[]): T[] => {
    return rows.filter((row) => {
      const dateValue = row.date ? new Date(String(row.date)) : null;
      if (startDate && dateValue && dateValue < new Date(startDate)) {
        return false;
      }
      if (endDate && dateValue && dateValue > new Date(endDate)) {
        return false;
      }
      if (regionFilter !== "all" && String(row.region ?? "") !== regionFilter) {
        return false;
      }
      if (resourceFilter !== "all" && String(row.resource_type ?? "") !== resourceFilter) {
        return false;
      }
      return true;
    });
  };

  const filteredFeatureRows = useMemo(() => applyFilters(featureRows), [featureRows, startDate, endDate, regionFilter, resourceFilter]);
  const filteredBaseRows = useMemo(() => applyFilters(baseRows), [baseRows, startDate, endDate, regionFilter, resourceFilter]);

  const calculateMetrics = useMemo(() => {
    const compute = <T extends FeatureRecord | BaseRecord>(
      rows: T[],
      getter: (row: T, key: MetricKey) => number
    ): MetricSummary => {
      if (!rows.length) return defaultMetrics;
      const totals = rows.reduce<TotalsAccumulator>(
        (acc, row) => {
          acc.cpu += getter(row, "usage_cpu");
          acc.storage += getter(row, "usage_storage");
          acc.users += getter(row, "users_active");
          return acc;
        },
        { cpu: 0, storage: 0, users: 0 }
      );
      return {
        averageCpu: totals.cpu / rows.length,
        averageStorage: totals.storage / rows.length,
        totalUsers: totals.users,
        records: rows.length
      };
    };

    return {
      before: compute(filteredBaseRows, getBaselineMetric),
      after: compute(filteredFeatureRows, getEngineeredMetric)
    };
  }, [filteredBaseRows, filteredFeatureRows]);

  const comparisonSeries = useMemo<ComparisonRow[]>(() => {
    const dateMap = new Map<string, { beforeCpu: number; beforeStorage: number; beforeCount: number; afterCpu: number; afterStorage: number; afterCount: number }>();

    filteredBaseRows.forEach((row) => {
      const key = row.date;
      if (!dateMap.has(key)) {
        dateMap.set(key, { beforeCpu: 0, beforeStorage: 0, beforeCount: 0, afterCpu: 0, afterStorage: 0, afterCount: 0 });
      }
      const entry = dateMap.get(key)!;
      entry.beforeCpu += getBaselineMetric(row, "usage_cpu");
      entry.beforeStorage += getBaselineMetric(row, "usage_storage");
      entry.beforeCount += 1;
    });

    filteredFeatureRows.forEach((row) => {
      const key = String(row.date);
      if (!dateMap.has(key)) {
        dateMap.set(key, { beforeCpu: 0, beforeStorage: 0, beforeCount: 0, afterCpu: 0, afterStorage: 0, afterCount: 0 });
      }
      const entry = dateMap.get(key)!;
      entry.afterCpu += getEngineeredMetric(row, "usage_cpu");
      entry.afterStorage += getEngineeredMetric(row, "usage_storage");
      entry.afterCount += 1;
    });

    return Array.from(dateMap.entries())
      .map(([date, values]) => ({
        date,
        beforeCpu: values.beforeCount ? values.beforeCpu / values.beforeCount : 0,
        afterCpu: values.afterCount ? values.afterCpu / values.afterCount : 0,
        beforeStorage: values.beforeCount ? values.beforeStorage / values.beforeCount : 0,
        afterStorage: values.afterCount ? values.afterStorage / values.afterCount : 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredBaseRows, filteredFeatureRows]);

  const resourceComparison = useMemo<ResourceComparisonRow[]>(() => {
    const map = new Map<string, { beforeTotal: number; beforeCount: number; afterTotal: number; afterCount: number }>();

    filteredBaseRows.forEach((row) => {
      const key = row.resource_type || "Unknown";
      if (!map.has(key)) map.set(key, { beforeTotal: 0, beforeCount: 0, afterTotal: 0, afterCount: 0 });
      const entry = map.get(key)!;
      entry.beforeTotal += getBaselineMetric(row, "usage_cpu");
      entry.beforeCount += 1;
    });

    filteredFeatureRows.forEach((row) => {
      const key = (row.resource_type as string) || "Unknown";
      if (!map.has(key)) map.set(key, { beforeTotal: 0, beforeCount: 0, afterTotal: 0, afterCount: 0 });
      const entry = map.get(key)!;
      entry.afterTotal += getEngineeredMetric(row, "usage_cpu");
      entry.afterCount += 1;
    });

    return Array.from(map.entries())
      .map(([resource, values]) => ({
        resource,
        before: values.beforeCount ? values.beforeTotal / values.beforeCount : 0,
        after: values.afterCount ? values.afterTotal / values.afterCount : 0
      }))
      .sort((a, b) => b.after - a.after)
      .slice(0, 8);
  }, [filteredBaseRows, filteredFeatureRows]);

  const regionDelta = useMemo<RegionDeltaRow[]>(() => {
    const map = new Map<string, { before: number; after: number; beforeCount: number; afterCount: number }>();

    filteredBaseRows.forEach((row) => {
      const key = row.region || "Unknown";
      if (!map.has(key)) map.set(key, { before: 0, after: 0, beforeCount: 0, afterCount: 0 });
      const entry = map.get(key)!;
      entry.before += getBaselineMetric(row, "usage_cpu");
      entry.beforeCount += 1;
    });

    filteredFeatureRows.forEach((row) => {
      const key = (row.region as string) || "Unknown";
      if (!map.has(key)) map.set(key, { before: 0, after: 0, beforeCount: 0, afterCount: 0 });
      const entry = map.get(key)!;
      entry.after += getEngineeredMetric(row, "usage_cpu");
      entry.afterCount += 1;
    });

    return Array.from(map.entries())
      .map(([region, values]) => {
        const beforeAvg = values.beforeCount ? values.before / values.beforeCount : 0;
        const afterAvg = values.afterCount ? values.after / values.afterCount : 0;
        return {
          region,
          before: beforeAvg,
          after: afterAvg,
          delta: afterAvg - beforeAvg
        };
      })
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 6);
  }, [filteredBaseRows, filteredFeatureRows]);

  const metricsBefore = calculateMetrics.before;
  const metricsAfter = calculateMetrics.after;

  const cards = [
    {
      label: "Average CPU",
      before: metricsBefore.averageCpu,
      after: metricsAfter.averageCpu,
      unit: "%",
      accent: "from-sky-500/20 to-sky-600/30"
    },
    {
      label: "Average Storage",
      before: metricsBefore.averageStorage,
      after: metricsAfter.averageStorage,
      unit: " TB",
      accent: "from-emerald-500/20 to-emerald-600/30"
    },
    {
      label: "Total Active Users",
      before: metricsBefore.totalUsers,
      after: metricsAfter.totalUsers,
      unit: " users",
      accent: "from-violet-500/20 to-violet-600/30"
    },
    {
      label: "Record Count",
      before: metricsBefore.records,
      after: metricsAfter.records,
      unit: " rows",
      accent: "from-amber-500/20 to-amber-600/30"
    }
  ];

  if (loading) {
    return <div className="p-10 text-slate-200">Loading insights...</div>;
  }

  if (error) {
    return <div className="p-10 text-rose-300">{error}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-slate-950/95 px-8 py-10 text-slate-100">
      <header className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-r from-purple-600/25 via-slate-900/80 to-slate-950/95 p-10 shadow-[0_38px_85px_-48px_rgba(168,85,247,0.55)]">
        <div className="absolute inset-0">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute right-16 top-12 h-64 w-64 rounded-full bg-emerald-400/15 blur-[110px]" />
          <div className="absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-purple-400/40 bg-purple-500/20 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.38em] text-purple-100">
                Insights Intelligence Suite
              </span>
              <h1 className="mt-4 text-4xl font-semibold text-white">Before vs After Feature Engineering</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300/90">
                Track how engineered features amplify demand forecasting signals. Blend baseline telemetry with feature-engineered enrichments, filter across regions, resources, and date ranges, and discover the lift captured across the stack.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => {
              const delta = card.after - card.before;
              const positive = delta >= 0;
              return (
                <article
                  key={card.label}
                  className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${card.accent} px-6 py-6 shadow-[0_26px_65px_-40px_rgba(14,165,233,0.55)] backdrop-blur`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.32em] text-slate-200/70">
                    <span>{card.label}</span>
                    <span className={`rounded-full px-3 py-1 ${positive ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>
                      {positive ? "Gain" : "Drop"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end gap-4">
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.25em] text-slate-400">After</p>
                      <p className="text-3xl font-semibold text-white">{formatNumber(card.after, 2)}{card.unit}</p>
                    </div>
                    <div className="text-sm text-slate-300/85">
                      <p className="text-[12px] uppercase tracking-[0.25em] text-slate-400">Before</p>
                      <p>{formatNumber(card.before, 2)}{card.unit}</p>
                    </div>
                    <div className={`ml-auto rounded-2xl border px-3 py-2 text-sm font-semibold ${positive ? "border-emerald-400/50 text-emerald-300" : "border-rose-400/50 text-rose-300"}`}>
                      {formatDelta(delta)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </header>

      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-8 shadow-[0_30px_60px_-45px_rgba(59,130,246,0.55)]">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <CalendarDays size={16} className="text-sky-300" /> From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <CalendarDays size={16} className="text-sky-300" /> To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <Layers size={16} className="text-emerald-300" /> Resource Type
              </label>
              <select
                value={resourceFilter}
                onChange={(event) => setResourceFilter(event.target.value)}
                className="min-w-[200px] rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {resources.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Resources" : option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <MapPin size={16} className="text-amber-300" /> Region
              </label>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="min-w-[200px] rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {regions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Regions" : option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 px-6 py-5 text-sm text-slate-300/90">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200">Filter Snapshot</h2>
            <div className="mt-4 space-y-2">
              <p>
                <span className="text-slate-400">Dates:</span> {startDate || "Earliest"} → {endDate || "Latest"}
              </p>
              <p>
                <span className="text-slate-400">Resource:</span> {resourceFilter === "all" ? "All" : resourceFilter}
              </p>
              <p>
                <span className="text-slate-400">Region:</span> {regionFilter === "all" ? "All" : regionFilter}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_32px_70px_-48px_rgba(14,165,233,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">CPU & Storage Evolution</h3>
              <p className="mt-1 text-sm text-slate-300/80">Average daily utilisation before vs after feature engineering</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Trend</span>
          </div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={comparisonSeries}>
                <defs>
                  <linearGradient id="beforeCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="afterCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#6366f1" stopOpacity={0.48} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} minTickGap={28} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} width={70} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(2,6,23,0.94)", borderRadius: 16, border: "1px solid rgba(59,130,246,0.4)", color: "#e2e8f0" }}
                  labelFormatter={(value) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="beforeCpu" name="CPU Before" stroke="#38bdf8" strokeWidth={2.4} fill="url(#beforeCpu)" activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="afterCpu" name="CPU After" stroke="#6366f1" strokeWidth={2.4} fill="url(#afterCpu)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_32px_70px_-48px_rgba(244,114,182,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Region Lift Index</h3>
              <p className="mt-1 text-sm text-slate-300/80">Average CPU uplift after feature engineering</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-200">Delta</span>
          </div>
          <div className="mt-6 space-y-4">
            {regionDelta.map((entry, idx) => {
              const positive = entry.delta >= 0;
              return (
                <div key={entry.region} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-white">
                    <span>{entry.region}</span>
                    <span className={positive ? "text-emerald-300" : "text-rose-300"}>{formatDelta(entry.delta)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${positive ? "bg-emerald-400/70" : "bg-rose-400/70"}`}
                      style={{ width: `${Math.min(Math.abs(entry.delta) * 6, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[12px] text-slate-400">
                    <span>Before {formatNumber(entry.before, 2)}%</span>
                    <span>After {formatNumber(entry.after, 2)}%</span>
                  </div>
                </div>
              );
            })}
            {!regionDelta.length && <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">No regional data available for the current filters.</div>}
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_32px_80px_-52px_rgba(56,189,248,0.55)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Resource Signal Shift</h3>
            <p className="mt-1 text-sm text-slate-300/80">Average CPU utilisation for key resources</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Comparison</span>
        </div>
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={resourceComparison} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="resource" stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 11 }} angle={-12} textAnchor="end" interval={0} height={60} />
              <YAxis stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} width={70} />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(2,6,23,0.94)", borderRadius: 16, border: "1px solid rgba(52,211,153,0.4)", color: "#e2e8f0" }}
                formatter={(value: number, name: string) => [formatNumber(value, 2) + "%", name === "before" ? "Before" : "After"]}
              />
              <Legend />
              <Bar dataKey="before" name="Before" fill="#38bdf8" radius={[14, 14, 0, 0]} />
              <Bar dataKey="after" name="After" fill="#22c55e" radius={[14, 14, 0, 0]} />
              {resourceComparison.map((entry, index) => (
                <Cell key={entry.resource} fill={palette[index % palette.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default Insights;
