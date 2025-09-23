import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Overview from './pages/Overview';
import Trends from './pages/Trends';
import Forecasting from './pages/Forecasting';
import Insights from './pages/Insights';
import Features from './pages/Features';
import Correlations from './pages/Correlations';
import Engagement from './pages/Engagement';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/engagement" element={<Engagement />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/forecasting" element={<Forecasting />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/features" element={<Features />} />
            <Route path="/correlations" element={<Correlations />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
