import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Activity, Zap, GaugeCircle, Sparkles, ChevronDown } from "lucide-react";
import TrendLineChartAnimated from "../components/TrendLineChartAnimated";

const DATA_URL = "/data/feature_engineered.csv";

type FeatureRecord = {
  [key: string]: string | number | null | undefined;
  date?: string | null;
  region?: string | null;
  resource_type?: string | null;
  usage_cpu?: number | null;
  usage_storage?: number | null;
};

type DateMode = "all" | "range" | "specific";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

type FilterOption = {
  label: string;
  value: string;
};

interface FilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  accent?: "purple" | "sky";
}

const accentStyles: Record<NonNullable<FilterDropdownProps["accent"]>, { button: string; optionActive: string; caret: string; dot: string }> = {
  purple: {
    button: "hover:bg-purple-500/15 focus:ring-purple-400/40",
    optionActive: "bg-purple-500/20 text-purple-100",
    caret: "text-purple-200",
    dot: "bg-purple-300",
  },
  sky: {
    button: "hover:bg-sky-500/15 focus:ring-sky-400/40",
    optionActive: "bg-sky-500/20 text-sky-100",
    caret: "text-sky-200",
    dot: "bg-sky-300",
  },
};

const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, value, options, onChange, accent = "purple" }) => {
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

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const accentTheme = accentStyles[accent] ?? accentStyles.purple;
  const selected = options.find((option) => option.value === value) ?? options[0];
  const labelText = selected?.label ?? value;

  return (
    <div ref={containerRef} className="relative min-w-[180px]" style={{ zIndex: 100 }}>
      <span className="stellar-label text-[10px] text-slate-400">{label}</span>
      <button
        type="button"
        className={`group mt-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-offset-0 ${accentTheme.button}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{labelText}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""} ${accentTheme.caret}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/95 p-1 shadow-[0_24px_60px_-35px_rgba(129,140,248,0.6)] backdrop-blur"
          style={{ zIndex: 9999 }}
          role="listbox"
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2 text-xs font-semibold text-slate-200 transition ${
                  isActive ? accentTheme.optionActive : "hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isActive && <span className={`h-2 w-2 rounded-full ${accentTheme.dot}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PerformanceInsights: React.FC = () => {
  const [rows, setRows] = useState<FeatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [region, setRegion] = useState("all");
  const [resource, setResource] = useState("all");
  const [dateMode, setDateMode] = useState<DateMode>("all");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [specificDate, setSpecificDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
          throw new Error("Failed to fetch performance dataset");
        }
        const csv = await response.text();
        Papa.parse<FeatureRecord>(csv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (result) => {
            if (cancelled) return;
            const parsed = (result.data ?? []).filter((entry) =>
              Object.values(entry).some((value) => value !== null && value !== "")
            );
            setRows(parsed);
            setLoading(false);
          },
          error: (err: Papa.ParseError | Error) => {
            if (cancelled) return;
            console.error(err);
            setError("Unable to parse performance dataset");
            setLoading(false);
          },
        });
      } catch (err: unknown) {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Unexpected error loading performance dataset");
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedDates = useMemo(() => {
    const dates = new Set<string>();
    rows.forEach((row) => {
      if (row.date) {
        dates.add(new Date(row.date as string).toISOString().slice(0, 10));
      }
    });
    return Array.from(dates).sort();
  }, [rows]);

  useEffect(() => {
    if (orderedDates.length && !startDate && !endDate) {
      setStartDate(orderedDates[0]);
      setEndDate(orderedDates[orderedDates.length - 1]);
    }
    if (orderedDates.length && !specificDate) {
      setSpecificDate(orderedDates[orderedDates.length - 1]);
    }
  }, [orderedDates, startDate, endDate, specificDate]);

  const regions = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      if (row.region) values.add(String(row.region));
    });
    return ["all", ...Array.from(values).sort()];
  }, [rows]);

  const resources = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      if (row.resource_type) values.add(String(row.resource_type));
    });
    return ["all", ...Array.from(values).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (region !== "all" && String(row.region ?? "") !== region) return false;
      if (resource !== "all" && String(row.resource_type ?? "") !== resource) return false;

      if (dateMode === "specific" && specificDate) {
        const normalized = row.date ? new Date(row.date as string).toISOString().slice(0, 10) : null;
        return normalized === specificDate;
      }
      if (dateMode === "range" && startDate && endDate) {
        if (!row.date) return false;
        const normalized = new Date(row.date as string).toISOString().slice(0, 10);
        return normalized >= startDate && normalized <= endDate;
      }
      return true;
    });
  }, [rows, region, resource, dateMode, startDate, endDate, specificDate]);

  const metrics = useMemo(() => {
    if (!filteredRows.length) {
      return {
        cpuAvg: 0,
        cpuMin: 0,
        cpuMax: 0,
        storageAvg: 0,
        storageMin: 0,
        storageMax: 0,
        activeResources: 0,
        performanceScore: 0,
      };
    }

    let cpuSum = 0;
    let cpuMin = Number.POSITIVE_INFINITY;
    let cpuMax = Number.NEGATIVE_INFINITY;
    let storageSum = 0;
    let storageMin = Number.POSITIVE_INFINITY;
    let storageMax = Number.NEGATIVE_INFINITY;
    let count = 0;

    filteredRows.forEach((row) => {
      const cpu = toNumber(row.usage_cpu);
      const storage = toNumber(row.usage_storage);
      if (cpu !== null) {
        cpuSum += cpu;
        cpuMin = Math.min(cpuMin, cpu);
        cpuMax = Math.max(cpuMax, cpu);
      }
      if (storage !== null) {
        storageSum += storage;
        storageMin = Math.min(storageMin, storage);
        storageMax = Math.max(storageMax, storage);
      }
      count += 1;
    });

    const activeResources = new Set(filteredRows.map((row) => String(row.resource_type ?? "Unknown"))).size;
    const cpuAvg = count ? cpuSum / count : 0;
    const storageAvg = count ? storageSum / count : 0;
    const normalizedCpu = cpuMax ? cpuAvg / cpuMax : 0;
    const normalizedStorage = storageMax ? storageAvg / storageMax : 0;
    const performanceScore = Math.round(((normalizedCpu + normalizedStorage) / 2) * 100);

    return {
      cpuAvg,
      cpuMin: cpuMin === Number.POSITIVE_INFINITY ? 0 : cpuMin,
      cpuMax: cpuMax === Number.NEGATIVE_INFINITY ? 0 : cpuMax,
      storageAvg,
      storageMin: storageMin === Number.POSITIVE_INFINITY ? 0 : storageMin,
      storageMax: storageMax === Number.NEGATIVE_INFINITY ? 0 : storageMax,
      activeResources,
      performanceScore,
    };
  }, [filteredRows]);

  const trendData = useMemo(() => {
    const map = new Map<
      string,
      {
        cpuTotal: number;
        storageTotal: number;
        count: number;
      }
    >();

    filteredRows.forEach((row) => {
      if (!row.date) return;
      const key = new Date(row.date as string).toISOString().slice(0, 10);
      const cpu = toNumber(row.usage_cpu) ?? 0;
      const storage = toNumber(row.usage_storage) ?? 0;
      const existing = map.get(key) ?? { cpuTotal: 0, storageTotal: 0, count: 0 };
      existing.cpuTotal += cpu;
      existing.storageTotal += storage;
      existing.count += 1;
      map.set(key, existing);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, values]) => ({
        date,
        cpu_avg: values.count ? values.cpuTotal / values.count : 0,
        storage_avg: values.count ? values.storageTotal / values.count : 0,
      }));
  }, [filteredRows]);

  const headerSubtitle = useMemo(() => {
    if (!filteredRows.length) return "No matching records";
    const earliest = filteredRows.reduce<string | null>((acc, row) => {
      if (!row.date) return acc;
      const normalized = new Date(row.date as string).toISOString().slice(0, 10);
      if (!acc || normalized < acc) return normalized;
      return acc;
    }, null);
    const latest = filteredRows.reduce<string | null>((acc, row) => {
      if (!row.date) return acc;
      const normalized = new Date(row.date as string).toISOString().slice(0, 10);
      if (!acc || normalized > acc) return normalized;
      return acc;
    }, null);

    if (earliest && latest) {
      return `Showing ${filteredRows.length.toLocaleString()} records from ${formatDateLabel(
        earliest
      )} to ${formatDateLabel(latest)}`;
    }
    return `Showing ${filteredRows.length.toLocaleString()} records.`;
  }, [filteredRows]);

  if (loading) {
    return <div className="p-8 text-slate-200">Loading performance insights…</div>;
  }

  if (error) {
    return <div className="p-8 text-rose-300">{error}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col gap-10 bg-transparent px-8 py-12 text-slate-100">
      <header className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-purple-600/25 via-slate-900/85 to-slate-950/95 p-12 shadow-[0_40px_85px_-45px_rgba(129,140,248,0.65)]">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-purple-500/25 blur-3xl" />
          <div className="absolute -right-32 top-16 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute bottom-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4">
              <span className="inline-flex items-center gap-3 rounded-full border border-purple-300/40 bg-purple-500/15 px-5 py-2 text-[11px] stellar-label text-purple-100">
                <Sparkles className="h-4 w-4" /> Live Insights
              </span>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-sky-400 text-white shadow-[0_25px_45px_-25px_rgba(168,85,247,0.7)]">
                  <Activity className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="stellar-heading text-3xl sm:text-4xl">Performance Insights</h1>
                  <p className="mt-3 max-w-3xl text-base text-slate-200/85">
                    Monitor CPU utilization and storage efficiency across Azure regions and resource types. Craft custom views with
                    responsive filters to spotlight the exact deployment slice that matters.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex h-fit items-center gap-3 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-5 py-2 text-sm font-semibold text-emerald-100 shadow-[0_25px_45px_-30px_rgba(16,185,129,0.6)]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" /> Data Ready
            </div>
          </div>
          <p className="text-xs stellar-label text-slate-400/85">{headerSubtitle}</p>
        </div>
      </header>

      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-7 shadow-[0_32px_75px_-40px_rgba(59,130,246,0.55)] backdrop-blur relative" style={{ zIndex: 50 }}>
        <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-400">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-slate-100 stellar-label">
            <GaugeCircle className="h-4 w-4 text-purple-300" /> Filters
          </span>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-semibold stellar-label transition ${
                dateMode === "all"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_12px_30px_-18px_rgba(129,140,248,0.75)]"
                  : "bg-white/5 text-slate-300 hover:bg-white/15"
              }`}
              onClick={() => setDateMode("all")}
            >
              All Data
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition ${
                dateMode === "range"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_12px_30px_-18px_rgba(129,140,248,0.75)]"
                  : "bg-white/5 text-slate-300 hover:bg-white/15"
              }`}
              onClick={() => setDateMode("range")}
            >
              Date Range
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition ${
                dateMode === "specific"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_12px_30px_-18px_rgba(129,140,248,0.75)]"
                  : "bg-white/5 text-slate-300 hover:bg-white/15"
              }`}
              onClick={() => setDateMode("specific")}
            >
              Specific Date
            </button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1 text-[11px] text-slate-300" style={{ zIndex: 10 }}>
              <span className="stellar-label text-[10px] text-slate-400">Date Mode</span>
              {dateMode === "range" && (
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col text-[11px]">
                    <span className="mb-1 stellar-label text-[10px] text-slate-400">Start</span>
                    <input
                      type="date"
                      value={startDate ?? ""}
                      min={orderedDates[0] ?? ""}
                      max={orderedDates[orderedDates.length - 1] ?? ""}
                      className="rounded-xl border border-slate-600/70 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value || null)}
                    />
                  </label>
                  <label className="flex flex-col text-[11px]">
                    <span className="mb-1 stellar-label text-[10px] text-slate-400">End</span>
                    <input
                      type="date"
                      value={endDate ?? ""}
                      min={orderedDates[0] ?? ""}
                      max={orderedDates[orderedDates.length - 1] ?? ""}
                      className="rounded-xl border border-slate-600/70 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEndDate(event.target.value || null)}
                    />
                  </label>
                </div>
              )}
              {dateMode === "specific" && (
                <label className="flex flex-col text-[11px]">
                  <span className="mb-1 stellar-label text-[10px] text-slate-400">Date</span>
                  <input
                    type="date"
                    value={specificDate ?? ""}
                    min={orderedDates[0] ?? ""}
                    max={orderedDates[orderedDates.length - 1] ?? ""}
                    className="rounded-xl border border-slate-600/70 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSpecificDate(event.target.value || null)}
                  />
                </label>
              )}
            </div>
            <FilterDropdown
              label="Resource"
              value={resource}
              onChange={setResource}
              accent="sky"
              options={resources.map((entry) => ({
                value: entry,
                label: entry === "all" ? "All Types" : entry,
              }))}
            />
            <FilterDropdown
              label="Region"
              value={region}
              onChange={setRegion}
              accent="purple"
              options={regions.map((entry) => ({
                value: entry,
                label: entry === "all" ? "All Regions" : entry,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4 relative" style={{ zIndex: 1 }}>
        <div className="glow-card overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/25 via-purple-600/20 to-slate-900/80 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_35px_60px_-35px_rgba(168,85,247,0.85)]">
          <h3 className="stellar-heading--cool text-sm">CPU Utilization</h3>
          <p className="mt-4 text-4xl font-semibold text-white">{formatPercent(metrics.cpuAvg)}%</p>
          <p className="mt-2 text-xs text-slate-300">Range {formatPercent(metrics.cpuMin)}% – {formatPercent(metrics.cpuMax)}%</p>
        </div>
        <div className="glow-card overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/25 via-emerald-500/15 to-slate-900/80 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_35px_60px_-35px_rgba(16,185,129,0.85)]">
          <h3 className="stellar-heading--cool text-sm">Storage Utilization</h3>
          <p className="mt-4 text-4xl font-semibold text-white">{formatPercent(metrics.storageAvg)}%</p>
          <p className="mt-2 text-xs text-slate-300">Range {formatPercent(metrics.storageMin)}% – {formatPercent(metrics.storageMax)}%</p>
        </div>
        <div className="glow-card overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/25 via-sky-400/15 to-slate-900/80 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_35px_60px_-35px_rgba(56,189,248,0.85)]">
          <h3 className="stellar-heading--cool text-sm">Active Resources</h3>
          <p className="mt-4 text-4xl font-semibold text-white">{metrics.activeResources}</p>
          <p className="mt-2 text-xs text-slate-300">Distinct resource types filtered</p>
        </div>
        <div className="glow-card overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-slate-900/80 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_35px_60px_-35px_rgba(245,158,11,0.85)]">
          <h3 className="stellar-heading--cool text-sm">Performance Score</h3>
          <p className="mt-4 text-4xl font-semibold text-white">{metrics.performanceScore}</p>
          <p className="mt-2 text-xs text-slate-300">Composite of CPU + Storage</p>
        </div>
      </section>

      <section className="grid gap-7 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-7 shadow-[0_35px_75px_-45px_rgba(99,102,241,0.6)]">
          <h2 className="stellar-heading text-base">Utilization Trends</h2>
          <p className="stellar-label text-[11px] text-slate-400">Average by date</p>
          <div className="mt-4 h-[320px]">
            {trendData.length ? (
              <TrendLineChartAnimated
                data={trendData as unknown as Record<string, unknown>[]}
                title=""
                series={[
                  { key: "cpu_avg", label: "CPU Utilization", color: "#a855f7" },
                  { key: "storage_avg", label: "Storage Utilization", color: "#10b981" },
                ]}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-600/60 text-sm text-slate-400">
                Not enough data for trend lines.
              </div>
            )}
          </div>
        </div>
        <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-900/85 via-slate-900/80 to-purple-900/35 p-7 shadow-[0_35px_75px_-45px_rgba(14,165,233,0.6)]">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-purple-300" />
            <h2 className="stellar-heading text-base">Filter Summary</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li className="flex items-center justify-between"><span className="stellar-label text-xs text-slate-400">Region</span><span className="font-semibold text-slate-100">{region === "all" ? "All Regions" : region}</span></li>
            <li className="flex items-center justify-between"><span className="stellar-label text-xs text-slate-400">Resource</span><span className="font-semibold text-slate-100">{resource === "all" ? "All Types" : resource}</span></li>
            <li className="flex items-center justify-between">
              <span className="stellar-label text-xs text-slate-400">Date Mode</span>
              <span className="font-semibold text-slate-100">
                {dateMode === "all" && "All Data"}
                {dateMode === "range" && startDate && endDate && `${formatDateLabel(startDate)} → ${formatDateLabel(endDate)}`}
                {dateMode === "specific" && specificDate && formatDateLabel(specificDate)}
              </span>
            </li>
            <li className="flex items-center justify-between"><span className="stellar-label text-xs text-slate-400">Total Records</span><span className="font-semibold text-slate-100">{filteredRows.length.toLocaleString()}</span></li>
          </ul>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-slate-900/80 p-7 shadow-[0_35px_80px_-45px_rgba(100,116,139,0.6)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="stellar-heading text-base">Performance Detail</h2>
            <p className="stellar-label text-[11px] text-slate-400">Showing all filtered records</p>
          </div>
          <span className="stellar-label text-[11px] text-slate-400">Total {filteredRows.length.toLocaleString()} records</span>
        </div>
        <div className="mt-4 max-h-[360px] overflow-auto rounded-2xl border border-white/10">
          <table className="min-w-full border-collapse text-sm text-slate-200">
            <thead className="sticky top-0 bg-slate-950/95 backdrop-blur">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left stellar-label text-xs">Date</th>
                <th className="px-4 py-3 text-left stellar-label text-xs">Region</th>
                <th className="px-4 py-3 text-left stellar-label text-xs">Resource</th>
                <th className="px-4 py-3 text-left stellar-label text-xs">CPU Util</th>
                <th className="px-4 py-3 text-left stellar-label text-xs">Storage</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={`${row.date ?? index}-${index}`} className={index % 2 === 0 ? "bg-slate-900/60" : "bg-slate-900/30"}>
                  <td className="px-4 py-3 whitespace-nowrap">{row.date ? formatDateLabel(row.date as string) : "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.region ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.resource_type ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.usage_cpu !== undefined && row.usage_cpu !== null ? `${formatPercent(Number(row.usage_cpu))}%` : "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.usage_storage !== undefined && row.usage_storage !== null ? formatPercent(Number(row.usage_storage)) : "—"}</td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PerformanceInsights;
