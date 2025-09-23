import React from "react";

export default function Filters({ filters, setFilters, regions, resourceTypes }) {
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-background rounded-xl shadow-md mb-6">
      <div className="flex flex-col">
        <label className="block text-sm font-semibold text-primary mb-2 uppercase tracking-wide">Start Date</label>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleDateChange}
          className="w-full px-4 py-3 border-2 border-border rounded-lg text-base font-medium text-text bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300"
        />
      </div>

      <div className="flex flex-col">
        <label className="block text-sm font-semibold text-primary mb-2 uppercase tracking-wide">End Date</label>
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleDateChange}
          className="w-full px-4 py-3 border-2 border-border rounded-lg text-base font-medium text-text bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300"
        />
      </div>

      <div className="flex flex-col">
        <label className="block text-sm font-semibold text-primary mb-2 uppercase tracking-wide">Region</label>
        <select
          name="region"
          value={filters.region}
          onChange={handleSelectChange}
          className="w-full px-4 py-3 border-2 border-border rounded-lg text-base font-medium text-text bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300"
        >
          <option value="">All Regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="block text-sm font-semibold text-primary mb-2 uppercase tracking-wide">Resource Type</label>
        <select
          name="resourceType"
          value={filters.resourceType}
          onChange={handleSelectChange}
          className="w-full px-4 py-3 border-2 border-border rounded-lg text-base font-medium text-text bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300"
        >
          <option value="">All Types</option>
          {resourceTypes.map(rt => <option key={rt} value={rt}>{rt}</option>)}
        </select>
      </div>
    </div>
  );
}
