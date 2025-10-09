// import React from "react";
// import ModelComparison from "../components/ModelComparison";

// const ModelComparisonPage = () => {
//   return (
//     <div className="min-h-screen bg-slate-950 px-10 py-12 text-slate-100">
//       <header className="rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-700/30 via-slate-900/80 to-sky-700/40 p-10 shadow-[0_45px_120px_-55px_rgba(129,140,248,0.55)]">
//         <p className="text-xs uppercase tracking-[0.4em] text-slate-300">Model Performance</p>
//         <h1 className="mt-2 text-3xl font-semibold text-white">Comparative Intelligence Board</h1>
//         <p className="mt-3 max-w-2xl text-sm text-slate-300/80">
//           Review accuracy, stability, and latency across the trained forecasting models. Use these insights to pick a deployment candidate.
//         </p>
//       </header>

//       <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-8">
//         <h2 className="text-lg font-semibold text-white">Performance Table</h2>
//         <p className="mt-1 text-sm text-slate-400">Summary metrics aggregated from backtesting and evaluation runs.</p>
//         <div className="mt-6">
//           <ModelComparison />
//         </div>
//       </section>
//     </div>
//   );
// };

// export default ModelComparisonPage;

// frontend/src/pages/ModelComparisonPage.jsx

import React, { useState, useEffect } from 'react';
import { Crown, TrendingUp, Clock, Zap, Award } from 'lucide-react';
import apiService from '../services/api';

const ModelComparisonPage = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    loadModelComparison();
  }, []);

  const loadModelComparison = async () => {
    try {
      const data = await apiService.getModelComparison();
      setModels(data.models);
      setRecommendation(data.recommendation);
    } catch (error) {
      console.error('Error loading model comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading model comparison...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Crown className="text-yellow-400" size={40} />
          Model Performance Comparison
        </h1>
        <p className="text-blue-200">
          Comprehensive evaluation of ARIMA, XGBoost, and LSTM models
        </p>
      </div>

      {/* Recommendation Card */}
      {recommendation && (
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-6 mb-8 shadow-2xl">
          <div className="flex items-start gap-4">
            <Award className="text-white" size={32} />
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                🏆 Recommended Model: {recommendation.best_overall}
              </h3>
              <p className="text-green-50 mb-2">{recommendation.reason}</p>
              <p className="text-sm text-green-100">
                <strong>Use Case:</strong> {recommendation.use_case}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Model Comparison Table */}
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700 shadow-2xl overflow-hidden">
        <h3 className="text-2xl font-semibold text-white mb-6">📊 Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-700">
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-300">Model</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">R² Score</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">RMSE</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">MAE</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">MAPE</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-300">Training Time</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-300">Inference Speed</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model, idx) => {
                const isBest = idx === 0;
                return (
                  <tr
                    key={model.name}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      isBest ? 'bg-blue-600/10' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {isBest && <Crown className="text-yellow-400" size={18} />}
                        <span className="font-semibold text-white">{model.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <span
                        className={`font-mono ${
                          model.r2_score > 0.8
                            ? 'text-green-400'
                            : model.r2_score > 0.6
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {model.r2_score.toFixed(4)}
                      </span>
                    </td>
                    <td className="text-right py-4 px-4 font-mono text-blue-400">{model.rmse.toFixed(2)}</td>
                    <td className="text-right py-4 px-4 font-mono text-purple-400">{model.mae.toFixed(2)}</td>
                    <td className="text-right py-4 px-4 font-mono text-orange-400">{model.mape.toFixed(2)}%</td>
                    <td className="text-center py-4 px-4 text-slate-300 flex items-center justify-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      {model.training_time}
                    </td>
                    <td className="text-center py-4 px-4 text-slate-300">
                      <div className="flex items-center justify-center gap-2">
                        <Zap size={16} className="text-yellow-400" />
                        {model.inference_speed}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      {model.status === 'Production' ? (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                          Production
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                          Experimental
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {models.map((model) => (
          <ModelDetailCard key={model.name} model={model} />
        ))}
      </div>
    </div>
  );
};

// Model Detail Card
const ModelDetailCard = ({ model }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700 shadow-lg hover:shadow-2xl transition-all">
      <h4 className="text-xl font-bold text-white mb-4">{model.name}</h4>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-400">Complexity:</span>
          <span className="text-white font-semibold">{model.complexity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Best For:</span>
          <span className="text-white font-semibold">{model.best_for}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Status:</span>
          <span
            className={`font-semibold ${
              model.status === 'Production' ? 'text-green-400' : 'text-blue-400'
            }`}
          >
            {model.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModelComparisonPage;
