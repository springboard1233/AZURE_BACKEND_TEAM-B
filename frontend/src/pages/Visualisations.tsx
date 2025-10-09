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
  LineChart,
  Line,
  ComposedChart,
  Bar,
  ReferenceLine
} from "recharts";
import { CalendarDays, MapPin, Layers, Sparkles } from "lucide-react";

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

interface SeasonalityPoint {
  month: string;
  before: number;
  after: number;
  delta: number;
  monthIndex: number;
}

interface TimeSeriesPoint {
  date: string;
  before: number;
  after: number;
  delta: number;
}

interface BoxPlotRow {
  region: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  beforeMean: number;
}

type MetricKey = "usage_cpu" | "usage_storage" | "users_active";

const FEATURE_OPTIONS: { value: MetricKey; label: string; engineeredCandidates: string[] }[] = [
  { value: "usage_cpu", label: "CPU Utilisation", engineeredCandidates: ["rolling_mean_7", "rolling_mean_30", "lag_7", "lag_30", "lag_1"] },
  {
    value: "usage_storage",
    label: "Storage Consumption",
    engineeredCandidates: ["storage_rolling_mean_7", "storage_rolling_mean_30", "rolling_mean_30", "rolling_mean_7"]
  },
  { value: "users_active", label: "Active Users", engineeredCandidates: ["users_active_rolling_mean_7", "users_active_trend", "lag_7", "lag_30"] }
];

const palette = ["#38bdf8", "#6366f1", "#f97316", "#22c55e", "#facc15", "#f472b6"];

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getBaselineMetric = (row: FeatureRecord | BaseRecord, key: MetricKey): number => toNumber((row as FeatureRecord)[key]);

const getEngineeredMetric = (row: FeatureRecord, key: MetricKey): number => {
  const option = FEATURE_OPTIONS.find((opt) => opt.value === key);
  if (!option) return getBaselineMetric(row, key);
  for (const candidate of option.engineeredCandidates) {
    const candidateValue = row[candidate];
    if (candidateValue !== undefined && candidateValue !== null && candidateValue !== "") {
      return toNumber(candidateValue as number | string | null | undefined);
    }
  }
  return getBaselineMetric(row, key);
};

const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);

const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const Visualisations: React.FC = () => {
  const [featureRows, setFeatureRows] = useState<FeatureRecord[]>([]);
  const [baseRows, setBaseRows] = useState<BaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<MetricKey>(FEATURE_OPTIONS[0].value);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  const dateBounds = useMemo(() => {
    const allDates: Date[] = [];
    featureRows.forEach((row) => {
      if (row.date) allDates.push(new Date(String(row.date)));
    });
    baseRows.forEach((row) => {
      if (row.date) allDates.push(new Date(String(row.date)));
    });
    if (!allDates.length) return { min: "", max: "" };
    const minDate = new Date(Math.min(...allDates.map((date) => date.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((date) => date.getTime())));
    const toInputValue = (date: Date) => date.toISOString().split("T")[0];
    return { min: toInputValue(minDate), max: toInputValue(maxDate) };
  }, [featureRows, baseRows]);

  useEffect(() => {
    if (dateBounds.min && !startDate) {
      setStartDate(dateBounds.min);
    }
    if (dateBounds.max && !endDate) {
      setEndDate(dateBounds.max);
    }
  }, [dateBounds, startDate, endDate]);

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
          complete: (res) => {
            if (cancelled) return;
            const parsed = (res.data ?? []).filter((row) => row.date);
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
    featureRows.forEach((row) => row.region && set.add(String(row.region)));
    baseRows.forEach((row) => row.region && set.add(String(row.region)));
    return ["all", ...Array.from(set).sort()];
  }, [featureRows, baseRows]);

  const resources = useMemo(() => {
    const set = new Set<string>();
    featureRows.forEach((row) => row.resource_type && set.add(String(row.resource_type)));
    baseRows.forEach((row) => row.resource_type && set.add(String(row.resource_type)));
    return ["all", ...Array.from(set).sort()];
  }, [featureRows, baseRows]);

  const applyFilters = <T extends FeatureRecord | BaseRecord>(rows: T[]): T[] =>
    rows.filter((row) => {
      const dateValue = row.date ? new Date(String(row.date)) : null;
      if (startDate && dateValue && dateValue < new Date(startDate)) return false;
      if (endDate && dateValue && dateValue > new Date(endDate)) return false;
      if (regionFilter !== "all" && String(row.region ?? "") !== regionFilter) return false;
      if (resourceFilter !== "all" && String(row.resource_type ?? "") !== resourceFilter) return false;
      return true;
    });

  const filteredFeatureRows = useMemo(() => applyFilters(featureRows), [featureRows, startDate, endDate, regionFilter, resourceFilter]);
  const filteredBaseRows = useMemo(() => applyFilters(baseRows), [baseRows, startDate, endDate, regionFilter, resourceFilter]);

  const seasonalitySeries = useMemo<SeasonalityPoint[]>(() => {
    const map = new Map<number, { before: number; after: number; beforeCount: number; afterCount: number }>();

    const accumulate = <T extends FeatureRecord | BaseRecord>(rows: T[], type: "before" | "after") => {
      rows.forEach((row) => {
        if (!row.date) return;
        const date = new Date(String(row.date));
        const monthIndex = date.getMonth();
        if (!map.has(monthIndex)) {
          map.set(monthIndex, { before: 0, after: 0, beforeCount: 0, afterCount: 0 });
        }
        const entry = map.get(monthIndex)!;
        const value = type === "before"
          ? getBaselineMetric(row, selectedFeature)
          : getEngineeredMetric(row as FeatureRecord, selectedFeature);
        if (type === "before") {
          entry.before += value;
          entry.beforeCount += 1;
        } else {
          entry.after += value;
          entry.afterCount += 1;
        }
      });
    };

    accumulate(filteredBaseRows, "before");
    accumulate(filteredFeatureRows, "after");

    return Array.from(map.entries())
      .map(([monthIndex, values]) => {
        const beforeAvg = values.beforeCount ? values.before / values.beforeCount : 0;
        const afterAvg = values.afterCount ? values.after / values.afterCount : 0;
        return {
          monthIndex,
          month: monthOrder[monthIndex] ?? `M${monthIndex + 1}`,
          before: beforeAvg,
          after: afterAvg,
          delta: afterAvg - beforeAvg
        };
      })
      .sort((a, b) => a.monthIndex - b.monthIndex);
  }, [filteredBaseRows, filteredFeatureRows, selectedFeature]);

  const timeSeries = useMemo<TimeSeriesPoint[]>(() => {
    const map = new Map<string, { before: number; after: number; beforeCount: number; afterCount: number }>();

    filteredBaseRows.forEach((row) => {
      const key = row.date;
      if (!map.has(key)) map.set(key, { before: 0, after: 0, beforeCount: 0, afterCount: 0 });
      const entry = map.get(key)!;
      entry.before += getBaselineMetric(row, selectedFeature);
      entry.beforeCount += 1;
    });

    filteredFeatureRows.forEach((row) => {
      const key = String(row.date);
      if (!map.has(key)) map.set(key, { before: 0, after: 0, beforeCount: 0, afterCount: 0 });
      const entry = map.get(key)!;
      entry.after += getEngineeredMetric(row, selectedFeature);
      entry.afterCount += 1;
    });

    return Array.from(map.entries())
      .map(([date, values]) => {
        const beforeAvg = values.beforeCount ? values.before / values.beforeCount : 0;
        const afterAvg = values.afterCount ? values.after / values.afterCount : 0;
        return {
          date,
          before: beforeAvg,
          after: afterAvg,
          delta: afterAvg - beforeAvg
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredBaseRows, filteredFeatureRows, selectedFeature]);

  const boxPlotData = useMemo<BoxPlotRow[]>(() => {
    const regionMap = new Map<string, { values: number[]; before: number[] }>();

    filteredFeatureRows.forEach((row) => {
      const key = (row.region as string) || "Unknown";
      if (!regionMap.has(key)) regionMap.set(key, { values: [], before: [] });
      regionMap.get(key)!.values.push(getEngineeredMetric(row, selectedFeature));
    });

    filteredBaseRows.forEach((row) => {
      const key = row.region || "Unknown";
      if (!regionMap.has(key)) regionMap.set(key, { values: [], before: [] });
      regionMap.get(key)!.before.push(getBaselineMetric(row, selectedFeature));
    });

    const quartiles = (values: number[]) => {
      if (!values.length) {
        return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
      }
      const sorted = [...values].sort((a, b) => a - b);
      const q = (p: number) => {
        if (!sorted.length) return 0;
        const pos = (sorted.length - 1) * p;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (sorted[base + 1] !== undefined) {
          return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        }
        return sorted[base];
      };
      return {
        min: sorted[0],
        q1: q(0.25),
        median: q(0.5),
        q3: q(0.75),
        max: sorted[sorted.length - 1]
      };
    };

    return Array.from(regionMap.entries())
      .map(([region, values]) => {
        const stats = quartiles(values.values);
        const beforeValues = values.before;
        const beforeMean = beforeValues.length
          ? beforeValues.reduce((sum, item) => sum + item, 0) / beforeValues.length
          : 0;
        return {
          region,
          min: stats.min,
          q1: stats.q1,
          median: stats.median,
          q3: stats.q3,
          max: stats.max,
          beforeMean
        };
      })
      .filter((entry) => Number.isFinite(entry.q3) && Number.isFinite(entry.q1))
      .sort((a, b) => b.median - a.median)
      .slice(0, 8);
  }, [filteredFeatureRows, filteredBaseRows, selectedFeature]);

  const [globalMin, globalMax] = useMemo(() => {
    if (!boxPlotData.length) return [0, 1];
    const mins = boxPlotData.map((entry) => entry.min);
    const maxs = boxPlotData.map((entry) => entry.max);
    const minVal = Math.min(...mins);
    const maxVal = Math.max(...maxs);
    return [minVal, maxVal === minVal ? minVal + 1 : maxVal];
  }, [boxPlotData]);

  const rangeSpan = globalMax - globalMin || 1;

  if (loading) {
    return <div className="p-10 text-slate-200">Loading visualisations...</div>;
  }

  if (error) {
    return <div className="p-10 text-rose-300">{error}</div>;
  }

  const hasSeasonalityData = seasonalitySeries.some((point) => point.before !== 0 || point.after !== 0);
  const hasTimeSeriesData = timeSeries.some((point) => point.before !== 0 || point.after !== 0);
  const hasBoxPlotData = boxPlotData.length > 0;

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-10 text-slate-100">
      <header className="relative overflow-hidden rounded-[3.5rem] border border-white/10 bg-gradient-to-br from-sky-700/25 via-slate-900/80 to-fuchsia-900/40 p-10 shadow-[0_60px_120px_-65px_rgba(34,197,94,0.65)]">
        <div className="absolute inset-0">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute left-1/4 top-0 h-60 w-60 rounded-full bg-fuchsia-400/15 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6">
          <span className="inline-flex items-center gap-3 rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-100">
            <Sparkles size={14} className="text-sky-200" /> Visualisations Studio
          </span>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-white">Seasonality & Variance Explorer</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300/90">
                Contrast baseline demand against engineered signals with rich seasonality, box-whisker comparisons, and multi-series demand trends. Tune filters to hone in on shifts across regions, resources, and time windows.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 px-6 py-5 text-sm text-slate-300/85">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Focus Metric</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {FEATURE_OPTIONS.map((option) => {
                  const active = option.value === selectedFeature;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedFeature(option.value)}
                      className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                        active ? "bg-sky-500/20 text-sky-100 border border-sky-400/50" : "bg-white/10 text-slate-300 hover:bg-white/15"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-8 shadow-[0_30px_60px_-45px_rgba(99,102,241,0.55)]">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <span className="flex items-center gap-2"><CalendarDays size={16} className="text-sky-300" /> From</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                min={dateBounds.min || undefined}
                max={dateBounds.max || undefined}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner transition focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <span className="flex items-center gap-2"><CalendarDays size={16} className="text-sky-300" /> To</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={dateBounds.min || undefined}
                max={dateBounds.max || undefined}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner transition focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <span className="flex items-center gap-2"><Layers size={16} className="text-emerald-300" /> Resource Type</span>
              <select
                value={resourceFilter}
                onChange={(event) => setResourceFilter(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {resources.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Resources" : option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <span className="flex items-center gap-2"><MapPin size={16} className="text-amber-300" /> Region</span>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-inner focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {regions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Regions" : option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 px-6 py-5 text-sm text-slate-300/90">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Current Slice</h2>
            <div className="mt-4 space-y-2">
              <p><span className="text-slate-400">Dates:</span> {startDate || "Earliest"} → {endDate || "Latest"}</p>
              <p><span className="text-slate-400">Resource:</span> {resourceFilter === "all" ? "All" : resourceFilter}</p>
              <p><span className="text-slate-400">Region:</span> {regionFilter === "all" ? "All" : regionFilter}</p>
              {dateBounds.min && (
                <p className="text-[11px] text-slate-500/80">Data available between {dateBounds.min} and {dateBounds.max}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_35px_75px_-50px_rgba(56,189,248,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Seasonality Signature</h3>
            <p className="mt-1 text-sm text-slate-300/80">Monthly rhythm of {FEATURE_OPTIONS.find((opt) => opt.value === selectedFeature)?.label.toLowerCase()} before vs after feature engineering.</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Seasonality</span>
        </div>
        <div className="mt-6 h-[320px] rounded-[2rem] border border-white/5 bg-slate-950/60 p-4">
          {hasSeasonalityData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={seasonalitySeries}>
                <CartesianGrid strokeDasharray="4 6" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} />
                <YAxis yAxisId="metric" stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} width={70} />
                <YAxis
                  yAxisId="delta"
                  orientation="right"
                  stroke="#f97316"
                  tick={{ fill: "#fbbf24", fontSize: 11 }}
                  width={60}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `${formatNumber(value, 1)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(2,6,23,0.94)", borderRadius: 16, border: "1px solid rgba(56,189,248,0.4)", color: "#e2e8f0" }}
                  formatter={(value: number, name: string, _payload, index) => {
                    const labelMap: Record<string, string> = {
                      before: "Before",
                      after: "After",
                      delta: "Delta"
                    };
                    if (name === "delta") {
                      const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
                      return [`${prefix}${formatNumber(Math.abs(value), 2)}`, labelMap[name] ?? name];
                    }
                    return [formatNumber(value, 2), labelMap[name] ?? name];
                  }}
                />
                <Legend wrapperStyle={{ color: "#cbd5f5" }} />
                <ReferenceLine yAxisId="delta" y={0} stroke="#f97316" strokeDasharray="4 4" />
                <Bar yAxisId="delta" dataKey="delta" name="Delta" barSize={18} radius={[6, 6, 0, 0]} fill="rgba(249,115,22,0.35)" />
                <Line yAxisId="metric" type="monotone" dataKey="before" name="Before" stroke="#38bdf8" strokeWidth={2.4} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line yAxisId="metric" type="monotone" dataKey="after" name="After" stroke="#6366f1" strokeWidth={2.4} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="6 4" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No seasonal patterns for the selected filters. Adjust the date window or resource to reveal trends.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_35px_75px_-50px_rgba(168,85,247,0.5)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Region Variance Boxplot</h3>
            <p className="mt-1 text-sm text-slate-300/80">Distribution of {FEATURE_OPTIONS.find((opt) => opt.value === selectedFeature)?.label.toLowerCase()} after feature engineering with baseline mean overlay.</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-200">Boxplot</span>
        </div>
        <div className="mt-6 space-y-4">
          {!hasBoxPlotData && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">No regional variance available for the selected filters.</div>
          )}
          {boxPlotData.map((entry, index) => {
            const color = palette[index % palette.length];
            const minPosition = ((entry.min - globalMin) / rangeSpan) * 100;
            const maxPosition = ((entry.max - globalMin) / rangeSpan) * 100;
            const q1Position = ((entry.q1 - globalMin) / rangeSpan) * 100;
            const q3Position = ((entry.q3 - globalMin) / rangeSpan) * 100;
            const medianPosition = ((entry.median - globalMin) / rangeSpan) * 100;
            const beforeMeanPosition = ((entry.beforeMean - globalMin) / rangeSpan) * 100;

            return (
              <div key={entry.region} className="rounded-2xl border border-white/10 bg-slate-950/65 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.region}</p>
                    <p className="text-xs text-slate-400">Median {formatNumber(entry.median, 2)}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">Range {formatNumber(entry.min, 1)} – {formatNumber(entry.max, 1)}</span>
                  </div>
                </div>
                <div className="mt-4 h-16">
                  <div className="relative mt-6 h-8 rounded-full bg-slate-900/80">
                    <div
                      className="absolute top-1/2 h-10 -translate-y-1/2 border-l border-slate-500"
                      style={{ left: `${minPosition}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-10 -translate-y-1/2 border-l border-slate-500"
                      style={{ left: `${maxPosition}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${q1Position}%`, width: `${Math.max(q3Position - q1Position, 1)}%`, backgroundColor: `${color}33`, border: `1px solid ${color}` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-[3px] rounded-full"
                      style={{ left: `${medianPosition}%`, backgroundColor: color }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-[3px] rounded-full bg-amber-300/90"
                      style={{ left: `${beforeMeanPosition}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-10 -translate-y-1/2 border border-slate-500"
                      style={{ left: `${minPosition}%`, width: `${maxPosition - minPosition}%` }}
                    />
                  </div>
                  <div className="mt-4 flex justify-between text-[11px] text-slate-400">
                    <span>Min {formatNumber(entry.min, 2)}</span>
                    <span>Q1 {formatNumber(entry.q1, 2)}</span>
                    <span>Median {formatNumber(entry.median, 2)}</span>
                    <span>Q3 {formatNumber(entry.q3, 2)}</span>
                    <span>Max {formatNumber(entry.max, 2)}</span>
                    <span>Baseline mean {formatNumber(entry.beforeMean, 2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_35px_75px_-50px_rgba(34,197,94,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Time-Series Demand Canvas</h3>
            <p className="mt-1 text-sm text-slate-300/80">Daily trajectory for {FEATURE_OPTIONS.find((opt) => opt.value === selectedFeature)?.label.toLowerCase()} across the selected slice.</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Trend</span>
        </div>
        <div className="mt-6 h-[360px] rounded-[2rem] border border-white/5 bg-slate-950/60 p-4">
          {hasTimeSeriesData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries}>
                <defs>
                  <linearGradient id="beforeTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#38bdf8" stopOpacity={0.65} />
                    <stop offset="90%" stopColor="#38bdf8" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="afterTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#22c55e" stopOpacity={0.65} />
                    <stop offset="90%" stopColor="#22c55e" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="deltaBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(249,115,22,0.45)" />
                    <stop offset="100%" stopColor="rgba(249,115,22,0.05)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} minTickGap={26} tickLine={false} axisLine={false} />
                <YAxis yAxisId="metric" stroke="#475569" tick={{ fill: "#cbd5f5", fontSize: 12 }} width={70} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="delta"
                  orientation="right"
                  stroke="#f97316"
                  tick={{ fill: "#fbbf24", fontSize: 11 }}
                  width={60}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `${formatNumber(value, 1)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(2,6,23,0.94)", borderRadius: 16, border: "1px solid rgba(34,197,94,0.4)", color: "#e2e8f0" }}
                  labelFormatter={(value) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))}
                  formatter={(value: number, name: string) => {
                    const labelMap: Record<string, string> = {
                      before: "Before",
                      after: "After",
                      delta: "Delta"
                    };
                    if (name === "delta") {
                      const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
                      return [`${prefix}${formatNumber(Math.abs(value), 2)}`, labelMap[name] ?? name];
                    }
                    return [formatNumber(value, 2), labelMap[name] ?? name];
                  }}
                />
                <Legend wrapperStyle={{ color: "#cbd5f5" }} />
                <ReferenceLine yAxisId="delta" y={0} stroke="#f97316" strokeDasharray="4 4" />
                <Area yAxisId="metric" type="monotone" dataKey="before" name="Before" stroke="#38bdf8" strokeWidth={2.4} fill="url(#beforeTrend)" activeDot={{ r: 5 }} />
                <Area yAxisId="metric" type="monotone" dataKey="after" name="After" stroke="#22c55e" strokeWidth={2.4} fill="url(#afterTrend)" activeDot={{ r: 5 }} strokeDasharray="6 4" />
                <Area yAxisId="delta" type="monotone" dataKey="delta" name="Delta" stroke="#f97316" strokeWidth={1.6} fill="url(#deltaBand)" activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Time-series trace unavailable. Try broadening the date range or removing filters.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Visualisations;
