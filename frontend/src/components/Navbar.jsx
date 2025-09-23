import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Overview', icon: '📊' },
    { path: '/trends', label: 'Usage Trends', icon: '📈' },
    { path: '/forecasting', label: 'Forecasts', icon: '🔮' },
    { path: '/insights', label: 'Insights', icon: '💡' },
    { path: '/features', label: 'Features Table', icon: '📋' },
    { path: '/correlations', label: 'Correlations', icon: '🔗' }
  ];

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                {navItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      location.pathname === item.path
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-center">Azure Demand Forecasting & Capacity Optimization system</h1>
          </div>
          <div className="flex items-center space-x-8">
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                {navItems.slice(3).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      location.pathname === item.path
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
