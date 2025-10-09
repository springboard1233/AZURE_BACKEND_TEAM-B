// frontend/src/components/ModelComparison.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Trophy, TrendingUp, Clock, Zap } from "lucide-react";

const ModelComparison = ({ compact = false }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        // ← UPDATED: Use new API endpoint
        const response = await fetch("http://localhost:8000/api/model-comparison");
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }
        const payload = await response.json();
        
        // ← UPDATED: Extract models from response
        const models = payload.models || [];
        setRows(models);
      } catch (err) {
        console.error(err);
        setError("Unable to load model metrics. Please ensure the FastAPI backend is running on port 8000.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const bestRow = useMemo(() => {
    if (!rows.length) return null;
    // ← UPDATED: Find best model by R² score
    return [...rows].sort((a, b) => (b.r2_score ?? 0) - (a.r2_score ?? 0))[0];
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" /> 
        <span className="text-slate-300 text-lg">Loading model comparison...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-6 text-rose-200">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">Error Loading Data</span>
        </div>
        <p className="text-sm">{error}</p>
        <p className="text-xs mt-2 text-rose-300">Make sure to run: <code className="bg-rose-900/30 px-2 py-1 rounded">python backend/main.py</code></p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-center">
        <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 mb-2">No models available</p>
        <p className="text-sm text-slate-500">Train models first using: <code className="bg-slate-800 px-2 py-1 rounded">python scripts/model_training/train_all.py</code></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Best Model Highlight Card */}
      {bestRow && !compact && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-400/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <div>
              <h3 className="text-xl font-bold text-white">Best Model: {bestRow.name}</h3>
              <p className="text-sm text-emerald-200">{bestRow.best_for}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-400">R² Score</div>
              <div className="text-2xl font-bold text-emerald-400">{bestRow.r2_score.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">RMSE</div>
              <div className="text-2xl font-bold text-blue-400">{bestRow.rmse.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">MAE</div>
              <div className="text-2xl font-bold text-purple-400">{bestRow.mae.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">MAPE</div>
              <div className="text-2xl font-bold text-orange-400">{bestRow.mape.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Model Comparison Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.3em] text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-4">Model</th>
              <th scope="col" className="px-6 py-4 text-right">R² Score</th>
              <th scope="col" className="px-6 py-4 text-right">MAE</th>
              <th scope="col" className="px-6 py-4 text-right">RMSE</th>
              <th scope="col" className="px-6 py-4 text-right">MAPE</th>
              {!compact && (
                <>
                  <th scope="col" className="px-6 py-4 text-center">Training Time</th>
                  <th scope="col" className="px-6 py-4 text-center">Inference Speed</th>
                  <th scope="col" className="px-6 py-4 text-center">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const isBest = bestRow && row.name === bestRow.name;
              return (
                <tr 
                  key={row.name} 
                  className={`transition-colors ${
                    isBest 
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20" 
                      : "bg-slate-950/60 hover:bg-slate-900/60"
                  }`}
                >
                  <td className="px-6 py-4 font-semibold text-white">
                    <div className="flex items-center gap-3">
                      {isBest && <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />}
                      <span className="text-base">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-mono text-base font-semibold ${
                      row.r2_score > 0.8 ? 'text-emerald-400' :
                      row.r2_score > 0.6 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {row.r2_score.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-purple-400">{row.mae.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono text-blue-400">{row.rmse.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono text-orange-400">{row.mape.toFixed(2)}%</td>
                  {!compact && (
                    <>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-300">{row.training_time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="text-slate-300">{row.inference_speed}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.status === 'Production' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
                            <TrendingUp className="h-3 w-3" />
                            Production
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                            Experimental
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="rounded-xl bg-slate-900/50 border border-white/5 p-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Metrics Guide</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400">R² Score:</span>
              <p className="text-slate-300 mt-1">Model fit quality (0-1, higher is better)</p>
            </div>
            <div>
              <span className="text-slate-400">MAE:</span>
              <p className="text-slate-300 mt-1">Mean Absolute Error (lower is better)</p>
            </div>
            <div>
              <span className="text-slate-400">RMSE:</span>
              <p className="text-slate-300 mt-1">Root Mean Squared Error (lower is better)</p>
            </div>
            <div>
              <span className="text-slate-400">MAPE:</span>
              <p className="text-slate-300 mt-1">Mean Absolute Percentage Error (lower is better)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelComparison;
