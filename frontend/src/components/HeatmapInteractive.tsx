import React, { useMemo } from "react";
import HeatMapGrid from "react-heatmap-grid";

interface HeatmapProps {
  data: number[][];
  features: string[];
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const interpolate = (start: number[], end: number[], factor: number) =>
  start.map((component, index) => component + (end[index] - component) * factor);

const toNumeric = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCorrelation = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const correlationColor = (value: number) => {
  const clamped = clamp(value, -1, 1);
  const intensity = Math.abs(clamped);

  // Blend between neutral slate and vibrant accent hues for stronger contrast
  const neutral = [46, 59, 86];
  const positive = [249, 115, 22];
  const negative = [59, 130, 246];
  const [r, g, b] = clamped >= 0
    ? interpolate(neutral, positive, Math.pow(intensity, 0.85))
    : interpolate(neutral, negative, Math.pow(intensity, 0.85));

  const alpha = 0.25 + intensity * 0.65;
  return `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${alpha})`;
};

const HeatmapInteractive: React.FC<HeatmapProps> = ({ data, features }) => {
  const safeMatrix = useMemo(() => data ?? [], [data]);
  const safeFeatures = useMemo(() => features ?? [], [features]);

  if (!safeMatrix.length || !safeFeatures.length) {
    return (
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 text-slate-200 text-sm">
        No heatmap data available
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-3xl p-6 m-2 w-full shadow-[0_25px_65px_-30px_rgba(14,165,233,0.45)] border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Correlation Heatmap</h3>
          <p className="text-xs text-slate-300/70 mt-1">
            Relationships across the top telemetry and engineered features. Hover to inspect values.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300/80">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-8 rounded-full bg-sky-400/70" /> Negative
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-8 rounded-full bg-slate-600/70" /> Neutral
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-8 rounded-full bg-orange-400/70" /> Positive
          </span>
        </div>
      </div>
      <div className="overflow-auto">
        <HeatMapGrid
          data={safeMatrix}
          xLabels={safeFeatures}
          yLabels={safeFeatures}
          cellRender={(x: number, y: number, rawValue: unknown) => {
            const value = toNumeric(rawValue);
            const formatted = formatCorrelation(value);
            return (
              <div
                className="text-[11px] font-medium"
                title={`${safeFeatures[y]} vs ${safeFeatures[x]}: ${formatted}`}
              >
                {formatted}
              </div>
            );
          }}
          cellStyle={(x: number, y: number, rawValue: unknown) => {
            const value = toNumeric(rawValue);
            const magnitude = Math.abs(value);
            const borderOpacity = x === y ? 0.55 : 0.2;
            return {
              background: correlationColor(value),
              color: magnitude > 0.55 ? "#f8fafc" : "#f1f5f9",
              fontWeight: magnitude > 0.4 ? "700" : "500",
              border: `1px solid rgba(15, 23, 42, ${borderOpacity})`,
              transition: "transform 160ms ease, box-shadow 160ms ease",
            };
          }}
          xLabelsStyle={(index: number) => ({
            color: "#e2e8f0",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            textAlign: "center",
          })}
          yLabelsStyle={() => ({
            color: "#e2e8f0",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          })}
          square
        />
      </div>
    </div>
  );
};

export default HeatmapInteractive;
