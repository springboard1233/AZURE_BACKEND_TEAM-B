import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import KPICardAnimated from "../components/KPICardAnimated";
import TrendLineChartAnimated from "../components/TrendLineChartAnimated";
import FeatureBarChartAnimated from "../components/FeatureBarChartAnimated";
import CorrelationMap from "../components/CorrelationMap";

interface ParsedData {
  date: string;
  region?: string;
  usage_cpu?: number;
  usage_storage?: number;
  storage_efficiency?: number;
  [key: string]: any;
}

interface TimeSeriesPoint {
  date: string;
  usage_cpu: number;
  usage_storage: number;
  storage_efficiency: number;
}

type EnrichedRecord = ParsedData & {
  usage_cpu: number;
  usage_storage: number;
  storage_efficiency: number;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const computeVariance = (values: number[]): number => {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sumSq = values.reduce((acc, value) => {
    const diff = value - mean;
    return acc + diff * diff;
  }, 0);
  return sumSq / (values.length - 1);
};

const computeCorrelation = (a: number[], b: number[]): number => {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;

  const meanA = a.reduce((sum, value) => sum + value, 0) / n;
  const meanB = b.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let sumSqA = 0;
  let sumSqB = 0;

  for (let i = 0; i < n; i += 1) {
    const diffA = a[i] - meanA;
    const diffB = b[i] - meanB;
    numerator += diffA * diffB;
    sumSqA += diffA * diffA;
    sumSqB += diffB * diffB;
  }

  const denominator = Math.sqrt(sumSqA) * Math.sqrt(sumSqB);
  if (!denominator) return 0;

  const correlation = numerator / denominator;
  return Math.max(-1, Math.min(1, correlation));
};

const aggregateByDate = (records: EnrichedRecord[]): TimeSeriesPoint[] => {
  const map = new Map<
    string,
    { date: string; usage_cpu: number; usage_storage: number; storage_efficiency: number; count: number }
  >();

  records.forEach((record) => {
    const entry = map.get(record.date) ?? {
      date: record.date,
      usage_cpu: 0,
      usage_storage: 0,
      storage_efficiency: 0,
      count: 0,
    };

    entry.usage_cpu += record.usage_cpu;
    entry.usage_storage += record.usage_storage;
    entry.storage_efficiency += record.storage_efficiency;
    entry.count += 1;
    map.set(record.date, entry);
  });

  return Array.from(map.values())
    .map((entry) => ({
      date: entry.date,
      usage_cpu: +(entry.usage_cpu / entry.count).toFixed(2),
      usage_storage: +(entry.usage_storage / entry.count).toFixed(2),
      storage_efficiency: +(entry.storage_efficiency / entry.count).toFixed(2),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const buildCorrelationBlueprint = (records: EnrichedRecord[]) => {
  if (!records.length) {
    return {
      selectedKeys: [] as string[],
      matrix: [] as number[][],
      featureScores: [] as { feature: string; importance: number }[],
      varianceByKey: [] as { key: string; variance: number }[],
    };
  }

  const numericKeys = Object.keys(records[0]).filter((key) => typeof records[0][key] === "number");
  const varianceByKey = numericKeys.map((key) => {
    const values = records.map((record) => toNumber(record[key]));
    return { key, variance: computeVariance(values) };
  });
  const varianceMap = new Map(varianceByKey.map((entry) => [entry.key, entry.variance]));

  const priorityKeys = ["usage_cpu", "usage_storage", "storage_efficiency"];
  const sortedKeys = varianceByKey
    .filter((entry) => entry.variance > 0)
    .sort((a, b) => b.variance - a.variance)
    .map((entry) => entry.key);

  const selectedKeys = Array.from(
    new Set([...priorityKeys.filter((key) => varianceMap.has(key)), ...sortedKeys])
  ).slice(0, 12);

  const matrix = selectedKeys.map((rowKey) => {
    const rowValues = records.map((record) => toNumber(record[rowKey]));
    return selectedKeys.map((colKey) => {
      const colValues = records.map((record) => toNumber(record[colKey]));
      return computeCorrelation(rowValues, colValues);
    });
  });

  const cpuValues = records.map((record) => record.usage_cpu);
  const featureScores = selectedKeys
    .filter((key) => key !== "usage_cpu")
    .map((key) => {
      const values = records.map((record) => toNumber(record[key]));
      return {
        feature: key,
        importance: Math.abs(computeCorrelation(values, cpuValues)),
      };
    })
    .filter((entry) => Number.isFinite(entry.importance))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  return { selectedKeys, matrix, featureScores, varianceByKey };
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [topFeatures, setTopFeatures] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [regionCount, setRegionCount] = useState(0);

  useEffect(() => {
    // Fetch CSV directly from public folder
    fetch("/data/feature_engineered.csv")
      .then((res) => res.text())
      .then((csvText) => {
        Papa.parse<ParsedData>(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedRows = (results.data as ParsedData[]).filter((row) => row?.date);

            if (!parsedRows.length) {
              setData([]);
              setTopFeatures([]);
              setFeatures([]);
              setHeatmapData([]);
              return;
            }

            const baseRecords: EnrichedRecord[] = parsedRows
              .map((row) => {
                const usageCpu = toNumber(row.usage_cpu);
                const usageStorage = toNumber(row.usage_storage);
                return {
                  ...row,
                  usage_cpu: usageCpu,
                  usage_storage: usageStorage,
                  storage_efficiency: toNumber(row.storage_efficiency),
                };
              })
              .filter((row) => Number.isFinite(row.usage_cpu) && Number.isFinite(row.usage_storage));

            if (!baseRecords.length) {
              setData([]);
              setTopFeatures([]);
              setFeatures([]);
              setHeatmapData([]);
              return;
            }

            const maxStorage = Math.max(...baseRecords.map((row) => row.usage_storage));
            const enrichedRecords: EnrichedRecord[] = baseRecords.map((row) => {
              const derivedEfficiency =
                row.storage_efficiency > 0
                  ? row.storage_efficiency
                  : maxStorage > 0
                  ? (row.usage_storage / maxStorage) * 100
                  : 0;

              return {
                ...row,
                storage_efficiency: Number.isFinite(derivedEfficiency)
                  ? +derivedEfficiency.toFixed(2)
                  : 0,
              };
            });

            setData(aggregateByDate(enrichedRecords));

            const { selectedKeys, matrix, featureScores, varianceByKey } = buildCorrelationBlueprint(
              enrichedRecords
            );

            setFeatures(selectedKeys);
            setHeatmapData(matrix);

            setRegionCount(new Set(enrichedRecords.map((record) => record.region ?? "Unknown")).size);

            const preparedFeatureScores = featureScores.length
              ? featureScores.map((score) => ({
                  feature: score.feature,
                  importance: +score.importance.toFixed(3),
                }))
              : (() => {
                  const fallback = varianceByKey
                    .filter((entry) => entry.key !== "usage_cpu")
                    .sort((a, b) => b.variance - a.variance)
                    .slice(0, 10);
                  const maxVariance = fallback.reduce(
                    (max, entry) => (entry.variance > max ? entry.variance : max),
                    0
                  );
                  return fallback.map((entry) => ({
                    feature: entry.key,
                    importance: maxVariance ? +(entry.variance / maxVariance).toFixed(3) : 0,
                  }));
                })();

            setTopFeatures(preparedFeatureScores);
          },
        });
      })
      .catch((error) => {
        console.error("Failed to load feature_engineered.csv", error);
        setData([]);
        setTopFeatures([]);
        setFeatures([]);
        setHeatmapData([]);
      });
  }, []);

  // Optional chaining to safely access properties
  const latest = data.length ? data[data.length - 1] : null;
  const cpuUtil = latest?.usage_cpu ?? 0;
  const storageEff = latest?.storage_efficiency ?? 0;
  const chartData = useMemo<Record<string, number | string>[]>(() => data.map((point) => ({ ...point })), [data]);

  const cpuTrend = useMemo(() => {
    if (data.length < 2) return 0;
    const prev = data[data.length - 2].usage_cpu || 0;
    if (!prev) return 0;
    return ((cpuUtil - prev) / prev) * 100;
  }, [data, cpuUtil]);

  const storageTrend = useMemo(() => {
    if (data.length < 2) return 0;
    const prev = data[data.length - 2].storage_efficiency || 0;
    if (!prev) return 0;
    return ((storageEff - prev) / prev) * 100;
  }, [data, storageEff]);

  const avgStorage = useMemo(() => {
    if (!data.length) return 0;
    const total = data.reduce((sum, item) => sum + item.usage_storage, 0);
    return total / data.length;
  }, [data]);

  const volatility = useMemo(() => {
    if (data.length < 2) return 0;
    const mean = data.reduce((sum, item) => sum + item.usage_cpu, 0) / data.length;
    const variance = data.reduce((acc, item) => acc + (item.usage_cpu - mean) ** 2, 0) / (data.length - 1);
    return Math.sqrt(variance);
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-10 lg:px-10">
        <header className="relative overflow-hidden rounded-4xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-slate-900/70 to-slate-950/90 p-8 shadow-[0_30px_70px_-40px_rgba(56,189,248,0.6)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_55%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs tracking-[0.35em] text-sky-200">
                MILESTONE II
              </span>
              <h1 className="mt-4 text-4xl font-semibold leading-snug text-white md:text-5xl">
                Azure Demand Intelligence
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300/85">
                Live operational telemetry blended with engineered signals. Track resource efficiency, surge periods, and critical feature drivers powering Azure demand forecasting.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300/75">
                <div className="rounded-full bg-white/5 px-4 py-1 uppercase tracking-[0.3em]">Updated {data.length ? "today" : "--"}</div>
                <div className="rounded-full bg-white/5 px-4 py-1 uppercase tracking-[0.3em]">Data points {data.length}</div>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-slate-200/80">
              <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/70 px-5 py-4">
                <span className="uppercase tracking-[0.25em] text-xs text-slate-400">Avg Storage Load</span>
                <span className="text-xl font-semibold text-white">{avgStorage.toFixed(1)} TB</span>
              </div>
              <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/70 px-5 py-4">
                <span className="uppercase tracking-[0.25em] text-xs text-slate-400">CPU Volatility</span>
                <span className="text-xl font-semibold text-white">{volatility.toFixed(2)} pts</span>
              </div>
              <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/70 px-5 py-4">
                <span className="uppercase tracking-[0.25em] text-xs text-slate-400">Regions Tracked</span>
                <span className="text-xl font-semibold text-white">{regionCount || "--"}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICardAnimated title="CPU Utilization" value={cpuUtil} unit="%" trend={cpuTrend} trendLabel="since last sample" />
          <KPICardAnimated title="Storage Efficiency" value={storageEff} unit="%" trend={storageTrend} trendLabel="since last sample" />
          <KPICardAnimated title="Avg Storage Load" value={avgStorage} unit=" TB" trend={cpuTrend / 2} trendLabel="rolling change" />
          <KPICardAnimated title="Signal Volatility" value={volatility} unit=" pts" trend={volatility ? (volatility / (cpuUtil || 1)) * 100 : 0} trendLabel="vs CPU" />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
        <TrendLineChartAnimated
            data={chartData}
          title="CPU vs Storage Utilization"
          series={[
            { key: "usage_cpu", label: "CPU Utilization", color: "#38bdf8" },
            { key: "usage_storage", label: "Storage Consumption", color: "#f97316" },
          ]}
          />
          <TrendLineChartAnimated
            data={chartData}
            title="Storage Efficiency & CPU"
            series={[
              { key: "storage_efficiency", label: "Storage Efficiency", color: "#facc15" },
              { key: "usage_cpu", label: "CPU Utilization", color: "#22d3ee" },
            ]}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <FeatureBarChartAnimated data={topFeatures} title="Top Feature Signals" />
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_55px_-35px_rgba(8,145,178,0.55)]">
            <h3 className="text-lg font-semibold text-white">Operational Highlights</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-300/85">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                <span>Utilization remains stable with {cpuTrend.toFixed(1)}% change since last sample.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                <span>Storage efficiency trending {storageTrend >= 0 ? "up" : "down"} toward balanced capacity.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                <span>Top engineered features highlight lag-based signals driving forecast accuracy.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                <span>Use the correlation map to inspect cross-feature influence across telemetry metrics.</span>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <CorrelationMap data={heatmapData} features={features} />
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
