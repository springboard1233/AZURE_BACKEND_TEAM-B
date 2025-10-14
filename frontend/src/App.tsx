// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Analytics from './pages/Analytics';
import RawData from './pages/RawData';
import MergedData from './pages/MergedData';
import FeaturedData from './pages/FeaturedData';
import Insights from './pages/Insights';
import Visualisations from './pages/Visualisations';
import PerformanceInsights from './pages/PerformanceInsights';
import Dashboard from './pages/DashboardPage';
// ← NEW IMPORTS: ML Forecasting Pages
import Forecasts from './pages/Forecasts';
import ModelComparisonPage from './pages/ModelComparisonPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex bg-gray-900 min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white min-h-screen overflow-auto">
          <Routes>
            {/* Existing Routes */}
            <Route path="/" element={<Overview />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/raw-data" element={<RawData />} />
            <Route path="/merged-data" element={<MergedData />} />
            <Route path="/featured-data" element={<FeaturedData />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/visualisations" element={<Visualisations />} />
            <Route path="/performance" element={<PerformanceInsights />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* ← NEW ROUTES: ML Forecasting */}
            <Route path="/forecasts" element={<Forecasts />} />
            <Route path="/model-comparison" element={<ModelComparisonPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
