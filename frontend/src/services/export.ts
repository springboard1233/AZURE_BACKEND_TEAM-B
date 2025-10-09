// frontend/src/services/export.ts

export const exportService = {
  // Export forecast to CSV
  downloadForecastCSV: (data: any) => {
    const csvContent = [
      ['Date', 'Prediction', 'Lower Bound', 'Upper Bound', 'Day of Week', 'Is Weekend'],
      ...data.predictions.map((p: any) => [
        p.date,
        p.prediction.toFixed(2),
        p.confidence_lower.toFixed(2),
        p.confidence_upper.toFixed(2),
        p.day_of_week,
        p.is_weekend ? 'Yes' : 'No',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    downloadFile(csvContent, `forecast_${data.region}_${data.service}_${getTimestamp()}.csv`, 'text/csv');
  },

  // Export forecast to Excel
  downloadForecastExcel: (data: any) => {
    const csvContent = [
      ['Azure Demand Forecasting Report'],
      ['Region', data.region],
      ['Service', data.service],
      ['Forecast Period', data.forecast_period],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Date', 'Prediction', 'Lower Bound (95% CI)', 'Upper Bound (95% CI)', 'Day of Week', 'Weekend'],
      ...data.predictions.map((p: any) => [
        p.date,
        p.prediction.toFixed(2),
        p.confidence_lower.toFixed(2),
        p.confidence_upper.toFixed(2),
        p.day_of_week,
        p.is_weekend ? 'Yes' : 'No',
      ]),
      [],
      ['Statistics'],
      ['Average', data.statistics.average.toFixed(2)],
      ['Minimum', data.statistics.min.toFixed(2)],
      ['Maximum', data.statistics.max.toFixed(2)],
      ['Std Dev', data.statistics.std.toFixed(2)],
      ['Trend', data.statistics.trend],
    ]
      .map((row) => row.join(','))
      .join('\n');

    downloadFile(csvContent, `forecast_report_${data.region}_${data.service}_${getTimestamp()}.xlsx`, 'text/csv');
  },
};

// Helper functions
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getTimestamp() {
  return new Date().toISOString().split('T')[0];
}

export default exportService;
