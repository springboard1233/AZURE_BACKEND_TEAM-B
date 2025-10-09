// frontend/src/components/Sidebar.tsx

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Cpu, 
  BarChart3, 
  Database, 
  Zap, 
  Calendar, 
  Table, 
  Activity, 
  Lightbulb, 
  LineChart,
  Brain,        // ← NEW: For ML Forecasting
  Trophy        // ← NEW: For Model Comparison
} from "lucide-react";

const Sidebar: React.FC = () => {
  const location = useLocation();

  const links = [
    { name: "Overview", path: "/", icon: <Cpu /> },
    { name: "Analytics", path: "/analytics", icon: <BarChart3 /> },
    { name: "Raw Data", path: "/raw-data", icon: <Database /> },
    { name: "Merged Data", path: "/merged-data", icon: <Calendar /> },
    { name: "Featured Data", path: "/featured-data", icon: <Table /> },
    { name: "Insights", path: "/insights", icon: <Lightbulb /> },
    { name: "Visualisations", path: "/visualisations", icon: <LineChart /> },
    // ← NEW: ML Forecasting Pages
    { name: "ML Forecasting", path: "/forecasts", icon: <Brain /> },
    { name: "Model Comparison", path: "/model-comparison", icon: <Trophy /> },
    // ← Existing pages
    { name: "Performance Insights", path: "/performance", icon: <Activity /> },
    { name: "Milestone 2 Dashboard", path: "/dashboard", icon: <Zap /> },
  ];

  return (
    <aside className="w-64 bg-gray-900 min-h-screen text-white p-4 shadow-2xl">
      <div className="text-2xl font-bold mb-8 text-blue-400 flex items-center gap-2">
        <Cpu className="animate-pulse" />
        AzureForge
      </div>
      <nav className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
              location.pathname === link.path 
                ? "bg-blue-600 shadow-lg transform scale-105" 
                : "hover:bg-gray-700 hover:translate-x-1"
            }`}
          >
            <span className={location.pathname === link.path ? "text-white" : "text-gray-400"}>
              {link.icon}
            </span>
            <span className="font-medium">{link.name}</span>
          </Link>
        ))}
      </nav>
      
      {/* Optional: Version Badge */}
      <div className="mt-8 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          <div className="mb-1">v2.0 • ML Enabled</div>
          <div className="flex items-center justify-center gap-1">
            <Brain size={12} className="text-blue-400" />
            <span>XGBoost R² 0.86</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
