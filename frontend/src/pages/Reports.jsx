import React from 'react';

const Reports = () => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Generate comprehensive reports and export insights</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold mb-2">Reports Module</h3>
        <p className="text-gray-600 mb-4">
          Advanced reporting capabilities will be implemented here, including:
        </p>
        <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
          <li>• Automated report generation</li>
          <li>• PDF/Excel export functionality</li>
          <li>• Custom report templates</li>
          <li>• Scheduled report delivery</li>
          <li>• Historical report archive</li>
        </ul>
      </div>
    </div>
  );
};

export default Reports;
