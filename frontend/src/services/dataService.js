import {
  getFeatures,
  getInsights,
  getUsageTrends,
  getTopRegions,
  getRawData,
  getCPUUsage,
  getStorageUsage,
  getUserEngagementMetrics,
  getResourceEfficiencyData,
  getEfficiencyTrends
} from "./api";

// CSV fallback loader
async function loadCSV(file) {
  try {
    const res = await fetch(`/data/${file}`);
    if (!res.ok) throw new Error(`Failed to fetch ${file}`);
    const text = await res.text();

    // Convert CSV into array of objects
    const [headerLine, ...lines] = text.trim().split("\n");
    const headers = headerLine.split(",");

    return lines.map(line => {
      const cols = line.split(",");
      return headers.reduce((obj, key, i) => {
        obj[key.trim()] = cols[i]?.trim();
        return obj;
      }, {});
    });
  } catch (err) {
    console.error("CSV load error:", err.message);
    return [];
  }
}

// Helper: API call with fallback
async function withFallback(apiFn, csvFile, params) {
  try {
    return await apiFn(params);
  } catch (err) {
    console.warn(`API failed for ${csvFile}, falling back to CSV…`);
    return await loadCSV(csvFile);
  }
}

export const dataService = {
  getFeatures: (params) => withFallback(getFeatures, "features.csv", params),
  getInsights: (params) => withFallback(getInsights, "insights.csv", params),
  getUsageTrends: (params) => withFallback(getUsageTrends, "usage_trends.csv", params),
  getTopRegions: (params) => withFallback(getTopRegions, "top_regions.csv", params),
  getRawData: (params) => withFallback(getRawData, "raw_data.csv", params),
  getCPUUsage: (params) => withFallback(getCPUUsage, "cpu_usage.csv", params),
  getStorageUsage: (params) => withFallback(getStorageUsage, "storage_usage.csv", params),
  getUserEngagementMetrics: () => withFallback(getUserEngagementMetrics, "user_engagement_metrics.csv"),
  getResourceEfficiencyData: () => withFallback(getResourceEfficiencyData, "resource_efficiency.csv"),
  getEfficiencyTrends: () => withFallback(getEfficiencyTrends, "efficiency_trends.csv"),
};
