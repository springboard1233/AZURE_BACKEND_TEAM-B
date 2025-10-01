import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Cpu, BarChart3, Database, Zap, Calendar } from "lucide-react";

const Sidebar: React.FC = () => {
  const location = useLocation();

  const links = [
    { name: "Overview", path: "/", icon: <Cpu /> },
    { name: "Analytics", path: "/analytics", icon: <BarChart3 /> },
    { name: "Raw Data", path: "/raw-data", icon: <Database /> },
    { name: "Merged Data", path: "/merged-data", icon: <Calendar /> },
  ];

  return (
    <aside className="w-64 bg-gray-900 min-h-screen text-white p-4">
      <div className="text-2xl font-bold mb-8">AzureForge</div>
      <nav className="space-y-4">
        {links.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`flex items-center space-x-3 p-2 rounded-md ${
              location.pathname === link.path ? "bg-blue-600" : "hover:bg-gray-700"
            }`}
          >
            {link.icon}
            <span>{link.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
