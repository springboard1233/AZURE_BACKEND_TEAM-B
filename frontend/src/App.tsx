import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Analytics from './pages/Analytics';
import RawData from './pages/RawData';
import MergedData from './pages/MergedData';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 bg-gray-800 text-white min-h-screen">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/raw-data" element={<RawData />} />
            <Route path="/merged-data" element={<MergedData />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
