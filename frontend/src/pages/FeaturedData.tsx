import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

type FeatureRecord = {
  [key: string]: string | number | null | undefined;
  date?: string | null;
  region?: string | null;
  resource_type?: string | null;
};

const formatValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2);
  }
  return value;
};

const FeaturedData: React.FC = () => {
  const [rows, setRows] = useState<FeatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [resource, setResource] = useState("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/data/feature_engineered.csv");
        if (!response.ok) {
          throw new Error("Failed to load featured data");
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
            setError("Unable to parse featured data");
            setLoading(false);
          },
        });
      } catch (err: unknown) {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Unexpected error loading featured data");
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [rows]);

  const regions = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      if (row.region) values.add(String(row.region));
    });
    return Array.from(values).sort();
  }, [rows]);

  const resources = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      if (row.resource_type) values.add(String(row.resource_type));
    });
    return Array.from(values).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (region !== "all" && String(row.region ?? "") !== region) {
        return false;
      }
      if (resource !== "all" && String(row.resource_type ?? "") !== resource) {
        return false;
      }
      if (!lowered) return true;
      return Object.values(row).some((value) =>
        value !== undefined && value !== null && String(value).toLowerCase().includes(lowered)
      );
    });
  }, [rows, search, region, resource]);

  if (loading) {
    return <div className="p-8 text-slate-200">Loading featured data...</div>;
  }

  if (error) {
    return <div className="p-8 text-rose-300">{error}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-950/95 px-8 py-10 text-slate-100">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-sky-900/40 via-slate-900/80 to-slate-950/90 p-8 shadow-[0_30px_60px_-40px_rgba(56,189,248,0.45)]">
        <div>
          <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/20 px-3 py-1 text-xs tracking-[0.35em] text-sky-200">
            FEATURED DATASET
          </span>
          <h1 className="mt-4 text-4xl font-semibold text-slate-50">Engineered Signals Explorer</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300/85">
            Inspect the full feature-engineered dataset powering the milestone dashboard. Filter by deployment region, resource type, or search across any metric to spot trends.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm">
            <p className="text-slate-400 uppercase tracking-[0.25em]">Total Records</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{rows.length.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm">
            <p className="text-slate-400 uppercase tracking-[0.25em]">Regions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{regions.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm">
            <p className="text-slate-400 uppercase tracking-[0.25em]">Resource Types</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{resources.length}</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-[0_25px_55px_-35px_rgba(14,165,233,0.45)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <label htmlFor="search" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Search all columns
            </label>
            <input
              id="search"
              name="search"
              type="search"
              placeholder={'Try "rolling_mean_7" or "West US"'}
              className="w-full rounded-xl border border-slate-600/70 bg-slate-900/90 px-4 py-2 text-sm text-slate-200 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Region</label>
              <select
                className="rounded-xl border border-slate-600/70 bg-slate-900/90 px-4 py-2 text-sm text-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                value={region}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setRegion(event.target.value)}
              >
                <option value="all">All</option>
                {regions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Resource</label>
              <select
                className="rounded-xl border border-slate-600/70 bg-slate-900/90 px-4 py-2 text-sm text-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                value={resource}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setResource(event.target.value)}
              >
                <option value="all">All</option>
                {resources.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full border-collapse text-sm text-slate-200">
              <thead className="sticky top-0 bg-slate-950/95 backdrop-blur">
                <tr className="border-b border-white/10">
                  {columns.map((key) => (
                    <th key={key} className="px-4 py-3 text-left font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {key.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr
                    key={`${row.date ?? index}-${index}`}
                    className={index % 2 === 0 ? "bg-slate-900/60" : "bg-slate-900/30"}
                  >
                    {columns.map((key) => (
                      <td key={key} className="px-4 py-3 whitespace-nowrap text-slate-200/95">
                        {formatValue(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="p-10 text-center text-slate-400">No rows match the current filters.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FeaturedData;
