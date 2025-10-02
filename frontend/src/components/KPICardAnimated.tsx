import React, { useState, useEffect, useMemo } from "react";

interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  trendLabel?: string;
}

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);

const KPICardAnimated: React.FC<KPICardProps> = ({ title, value, unit, trend, trendLabel }) => {
  const target = useMemo(() => {
    if (typeof value === "number") return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [value]);

  const [displayValue, setDisplayValue] = useState<number>(target);

  useEffect(() => {
    const startValue = displayValue;
    const delta = target - startValue;
    const duration = 600;
    let animationFrame = 0;

    const animate = (startTime: number) => {
      const step = (currentTime: number) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setDisplayValue(startValue + delta * eased);
        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        }
      };
      animationFrame = requestAnimationFrame(step);
    };

    const raf = requestAnimationFrame((time) => animate(time));
    return () => {
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(raf);
    };
  }, [target]);

  const trendDescriptor = useMemo(() => {
    if (trend === undefined) return null;
    const positive = trend >= 0;
    return {
      icon: positive ? "▲" : "▼",
      className: positive ? "text-emerald-300 bg-emerald-500/15" : "text-rose-300 bg-rose-500/15",
      text: `${Math.abs(trend).toFixed(1)}% ${trendLabel ?? (positive ? "increase" : "decrease")}`,
    };
  }, [trend, trendLabel]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/80 px-6 py-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_25px_65px_-30px_rgba(45,212,191,0.55)]">
      <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at top right, rgba(56,189,248,0.35), transparent 55%)" }} />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{title}</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse" aria-hidden />
        </div>
        <div>
          <p className="text-4xl font-semibold text-white leading-tight">
            {formatNumber(displayValue)}
            {unit && <span className="ml-2 text-lg text-slate-300/90">{unit}</span>}
          </p>
          <p className="mt-1 text-sm text-slate-400/90">Latest rolling average</p>
        </div>
        {trendDescriptor && (
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${trendDescriptor.className}`}>
            <span>{trendDescriptor.icon}</span>
            <span className="tracking-wide uppercase">{trendDescriptor.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICardAnimated;
