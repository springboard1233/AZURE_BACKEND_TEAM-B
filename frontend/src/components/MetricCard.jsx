import React from "react";

const MetricCard = ({ title, value, icon }) => {
  return (
    <div className="bg-card shadow-md rounded-lg p-6 border border-border hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-secondary text-sm font-semibold mb-2 uppercase tracking-wide">{title}</h3>
          <p className="text-3xl font-extrabold text-primary mt-1">{value}</p>
        </div>
        {icon && <div className="text-primary text-4xl">{icon}</div>}
      </div>
    </div>
  );
};

export default MetricCard;
