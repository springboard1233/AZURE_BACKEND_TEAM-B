import React, { useMemo, useState } from "react";

interface CorrelationMapProps {
  data: number[][];
  features: string[];
}

interface HoverState {
  featureX: string;
  featureY: string;
  value: number;
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const mixColor = (a: [number, number, number], b: [number, number, number], t: number) => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

const colorForValue = (value: number) => {
  const capped = clamp(value, -1, 1);
  const intensity = Math.abs(capped);
  const eased = Math.pow(intensity, 0.85);
  const neutral: [number, number, number] = [18, 24, 38];
  const positive: [number, number, number] = [248, 113, 113];
  const negative: [number, number, number] = [96, 165, 250];
  const [r, g, b] = capped >= 0 ? mixColor(neutral, positive, eased) : mixColor(neutral, negative, eased);
  const alpha = 0.18 + eased * 0.75;
  return `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${alpha.toFixed(2)})`;
};

const formatValue = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const CorrelationMap: React.FC<CorrelationMapProps> = ({ data, features }) => {
  const safeMatrix = useMemo(() => data ?? [], [data]);
  const safeFeatures = useMemo(() => features ?? [], [features]);
  const [hover, setHover] = useState<HoverState | null>(null);

  const legendSteps = useMemo(() => {
    const steps = 8;
    const values: { offset: number; color: string }[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const point = -1 + (2 * i) / steps;
      values.push({ offset: (i / steps) * 100, color: colorForValue(point) });
    }
    return values;
  }, []);

  const size = safeFeatures.length;
  const hasData = size > 0 && safeMatrix.length >= size;

  if (!hasData) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
        Correlation map unavailable
      </div>
    );
  }

  const viewBoxSize = 820;
  const margin = { top: 120, right: 120, bottom: 140, left: 160 };
  const innerWidth = viewBoxSize - margin.left - margin.right;
  const innerHeight = viewBoxSize - margin.top - margin.bottom;
  const cellSize = Math.min(innerWidth, innerHeight) / size;

  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-[0_32px_70px_-40px_rgba(59,130,246,0.55)]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Correlation Map</h3>
          <p className="text-sm text-slate-300/80">
            Explore pairwise feature influence. Hover a cell to inspect the precise Pearson coefficient.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300/80">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Negative
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Neutral
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Positive
          </div>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full" role="img" aria-label="Correlation map">
          <defs>
            <linearGradient id="correlation-legend" x1="0%" x2="0%" y1="0%" y2="100%">
              {legendSteps.map((step) => (
                <stop key={step.offset} offset={`${step.offset}%`} stopColor={step.color} />
              ))}
            </linearGradient>
          </defs>

          <rect
            x={margin.left}
            y={margin.top}
            width={innerWidth}
            height={innerHeight}
            rx={24}
            fill="rgba(15, 23, 42, 0.25)"
            stroke="rgba(148, 163, 184, 0.15)"
          />

          {safeFeatures.map((feature, index) => {
            const x = margin.left + index * cellSize + cellSize / 2;
            const y = margin.top + innerHeight + 40;
            return (
              <g key={`x-axis-${feature}`} transform={`translate(${x}, ${y}) rotate(-45)`}>
                <text
                  textAnchor="end"
                  fontSize={10}
                  fontWeight={600}
                  fill="#f1f5f9"
                  style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
                >
                  {feature.replace(/_/g, " ")}
                </text>
              </g>
            );
          })}

          {safeFeatures.map((feature, index) => {
            const x = margin.left - 20;
            const y = margin.top + index * cellSize + cellSize / 2 + 4;
            return (
              <text
                key={`y-axis-${feature}`}
                x={x}
                y={y}
                textAnchor="end"
                fontSize={12}
                fontWeight={600}
                fill="#e2e8f0"
                style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
              >
                {feature.replace(/_/g, " ")}
              </text>
            );
          })}

          {safeMatrix.map((row, rowIndex) =>
            row.slice(0, size).map((raw, colIndex) => {
              const value = Number.isFinite(raw) ? raw : 0;
              const x = margin.left + colIndex * cellSize;
              const y = margin.top + rowIndex * cellSize;
              const isDiagonal = rowIndex === colIndex;
              const display = formatValue(value);
              return (
                <g key={`cell-${rowIndex}-${colIndex}`}>
                  <rect
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill={colorForValue(value)}
                    stroke="rgba(15, 23, 42, 0.3)"
                    strokeWidth={0.75}
                    rx={8}
                    onMouseEnter={(event) => {
                      const rect = (event.target as SVGRectElement).getBoundingClientRect();
                      setHover({
                        featureX: safeFeatures[colIndex],
                        featureY: safeFeatures[rowIndex],
                        value,
                        x: rect.x + rect.width / 2,
                        y: rect.y + window.scrollY + rect.height / 2,
                      });
                    }}
                    onMouseLeave={() => setHover(null)}
                  />
                  {isDiagonal && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 4}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontWeight={700}
                      fontSize={12}
                    >
                      1.00
                    </text>
                  )}
                  {!isDiagonal && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 4}
                      textAnchor="middle"
                      fill="rgba(226, 232, 240, 0.95)"
                      fontWeight={500}
                      fontSize={11}
                    >
                      {display}
                    </text>
                  )}
                </g>
              );
            })
          )}

          <g>
            <rect
              x={viewBoxSize - margin.right + 40}
              y={margin.top}
              width={18}
              height={innerHeight}
              fill="url(#correlation-legend)"
              rx={9}
            />
            <text x={viewBoxSize - margin.right + 49} y={margin.top - 16} textAnchor="middle" fill="#e2e8f0" fontSize={12}>
              Strong +
            </text>
            <text x={viewBoxSize - margin.right + 49} y={margin.top + innerHeight + 28} textAnchor="middle" fill="#e2e8f0" fontSize={12}>
              Strong -
            </text>
          </g>
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-20 rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-lg backdrop-blur"
            style={{
              left: `calc(${hover.x}px - 140px)`,
              top: hover.y - 70,
              minWidth: 200,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{hover.featureY}</p>
            <p className="mt-1 text-base font-semibold text-white">{hover.featureX}</p>
            <p className="mt-2 text-sm text-slate-200">
              Pearson r: <span className="font-semibold text-sky-300">{formatValue(hover.value)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorrelationMap;
