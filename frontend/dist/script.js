// frontend/public/script.js
document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://127.0.0.1:5000/api';
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  // Navigation
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      navItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      tabContents.forEach(sec => sec.classList.toggle('active', sec.id === target));
    });
  });

  // Filters
  const fromDate = document.getElementById('fromDate');
  const toDate = document.getElementById('toDate');
  const regionSelect = document.getElementById('regionSelect');
  const rtypeSelect = document.getElementById('rtypeSelect');
  const applyBtn = document.getElementById('applyFilters');

  // Helper to build query string from filters
  function qs(params) {
    const nonEmpty = Object.entries(params).filter(([_,v]) => v !== '' && v != null);
    return nonEmpty.length ? '?' + new URLSearchParams(Object.fromEntries(nonEmpty)).toString() : '';
  }

  // Load filter dropdown options
  async function loadFilters() {
    try {
      const res = await fetch(`${API}/regions`);
      const data = await res.json();
      regionSelect.innerHTML = '<option value="">All</option>' + (data.regions || []).map(r => `<option value="${r}">${r}</option>`).join('');
      rtypeSelect.innerHTML = '<option value="">All</option>' + (data.resource_types || []).map(r => `<option value="${r}">${r}</option>`).join('');
    } catch (e) {
      console.error('Error loading filters:', e);
    }
  }

  // Chart helpers
  function createLine(ctxId, labels, datasets, options = {}) {
    const ctx = document.getElementById(ctxId);
    if (ctx.chart) ctx.chart.destroy();
    const chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: Object.assign({
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: { enabled: true, callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}` } },
          legend: { display: true }
        },
        scales: { x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } } }
      }, options)
    });
    ctx.chart = chart;
    return chart;
  }

  function createPie(ctxId, labels, data) {
    const ctx = document.getElementById(ctxId);
    if (ctx.chart) ctx.chart.destroy();
    const chart = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ label: 'share', data }] },
      options: { responsive: true, plugins: { tooltip: { enabled: true } } }
    });
    ctx.chart = chart;
    return chart;
  }

  // Utility functions
  function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
  function groupBy(arr, fn){ return arr.reduce((m, item)=>{ const k = fn(item); (m[k] ||= []).push(item); return m; }, {}); }

  // Load overview charts
  async function loadOverview() {
    try {
      // CPU Usage
      const cpuRes = await fetch(`${API}/cpu_usage${qs(filters())}`);
      const cpuData = await cpuRes.json();
      const dates = cpuData.map(d => d.date);
      const cpuVals = cpuData.map(d => d.usage_cpu);
      createLine('cpuUsageChart', dates, [{ label: 'CPU Usage (avg)', data: cpuVals, fill: true }]);

      // Storage Usage
      const stRes = await fetch(`${API}/storage_usage${qs(filters())}`);
      const stData = await stRes.json();
      const stDates = stData.map(d => d.date);
      const stVals = stData.map(d => d.usage_storage);
      createLine('storageUsageChart', stDates, [{ label: 'Storage Usage (avg)', data: stVals, fill: true }]);

      // Comparison raw vs 7-day rolling (from /api/features)
      const fRes = await fetch(`${API}/features${qs(filters())}`);
      const fData = await fRes.json();
      const byDate = {};
      fData.forEach(r => {
        const k = r.date;
        if (!byDate[k]) byDate[k] = { raw: [], roll: [] };
        if (r.usage_cpu != null) byDate[k].raw.push(Number(r.usage_cpu));
        if (r.cpu_roll_mean_7 != null) byDate[k].roll.push(Number(r.cpu_roll_mean_7));
      });
      const cmpDates = Object.keys(byDate).sort();
      const rawAvg = cmpDates.map(d => avg(byDate[d].raw));
      const rollAvg = cmpDates.map(d => avg(byDate[d].roll));
      createLine('comparisonChart', cmpDates, [
        { label: 'CPU Raw (avg)', data: rawAvg, fill: false },
        { label: 'CPU 7-day roll (avg)', data: rollAvg, fill: false }
      ]);

      // Region share pie (latest date)
      const latest = cmpDates[cmpDates.length - 1];
      const latestRows = fData.filter(r => r.date === latest);
      const byRegion = groupBy(latestRows, r => r.region || 'Unknown');
      const regions = Object.keys(byRegion);
      const regionMeans = regions.map(r => avg(byRegion[r].map(x => Number(x.usage_cpu || 0))));
      createPie('regionPieChart', regions, regionMeans);
    } catch (e) {
      console.error('Error loading overview:', e);
    }
  }

  // Load usage trends page
  async function loadUsageTrends() {
    try {
      const res = await fetch(`${API}/usage-trends${qs(filters())}`);
      const data = await res.json();
      if (!data.length) {
        const ctx = document.getElementById('usageTrendsChart').getContext('2d');
        ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
        return;
      }
      const grouped = groupBy(data, d => d.region);
      const dates = Array.from(new Set(data.map(d => d.date))).sort();
      const datasets = Object.keys(grouped).map(region => {
        const map = grouped[region].reduce((m, r) => { m[r.date] = r.usage_cpu; return m; }, {});
        const d = dates.map(dt => map[dt] !== undefined ? map[dt] : null);
        return { label: region, data: d, fill: false };
      });
      createLine('usageTrendsChart', dates, datasets, { plugins: { legend: { position: 'bottom' } } });

      // Load raw table
      const raw = await fetch(`${API}/raw-data${qs(filters())}`);
      const rawRows = await raw.json();
      renderTable('#rawTable', rawRows);
    } catch (e) {
      console.error('Error loading usage trends:', e);
    }
  }

  // Load forecasts page
  async function loadForecasts() {
    try {
      const days = 14;
      const res = await fetch(`${API}/recommendations?days=${days}`);
      const recs = await res.json();
      const labels = recs.map(r => r.date);
      const vals = recs.map(r => r.predicted_cpu_usage);
      createLine('forecastChart', labels, [{ label: 'Predicted CPU', data: vals, fill: true }]);
      document.getElementById('recoList').innerHTML = recs.map(r => `<li>${r.date}: ${r.predicted_cpu_usage} — ${r.recommendation}</li>`).join('');
    } catch (e) {
      console.error('Error loading forecasts:', e);
    }
  }

  // --- Milestone 2: Before vs After Comparison Chart ---
  async function loadComparisonBeforeAfter() {
    try {
      const rawRes = await fetch(`${API}/usage-trends${qs(filters())}`);
      const rawData = await rawRes.json();
      const before = {};
      rawData.forEach(r => {
        before[r.date] = (before[r.date] || []).concat([r.usage_cpu]);
      });

      const featRes = await fetch(`${API}/features${qs(filters())}`);
      const featData = await featRes.json();
      const after = {};
      featData.forEach(r => {
        after[r.date] = (after[r.date] || []).concat([r.usage_cpu]);
      });

      const dates = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
      const beforeAvg = dates.map(d => before[d] ? before[d].reduce((a,b)=>a+b,0)/before[d].length : null);
      const afterAvg = dates.map(d => after[d] ? after[d].reduce((a,b)=>a+b,0)/after[d].length : null);

      createLine('beforeAfterChart', dates, [
        { label: 'Before (raw)', data: beforeAvg, borderColor: 'red', fill: false },
        { label: 'After (engineered)', data: afterAvg, borderColor: 'blue', fill: false }
      ]);
    } catch (e) {
      console.error('Error loading comparison:', e);
    }
  }

  // --- Milestone 2: Seasonal Patterns Chart ---
  async function loadSeasonalPatterns() {
    try {
      const res = await fetch(`${API}/features${qs(filters())}`);
      const data = await res.json();
      if (!data.length) return;

      const monthMap = {};
      const weekMap = {};
      data.forEach(r => {
        if (r.month != null) {
          monthMap[r.month] = (monthMap[r.month] || []).concat([+r.usage_cpu]);
        }
        if (r.day_of_week != null) {
          weekMap[r.day_of_week] = (weekMap[r.day_of_week] || []).concat([+r.usage_cpu]);
        }
      });

      const months = Object.keys(monthMap).sort((a,b)=>a-b);
      const monthVals = months.map(m => monthMap[m].reduce((a,b)=>a+b,0)/monthMap[m].length);

      const days = Object.keys(weekMap).sort((a,b)=>a-b);
      const dayVals = days.map(d => weekMap[d].reduce((a,b)=>a+b,0)/weekMap[d].length);
      const dayLabels = days.map(d => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]);

      const ctx = document.getElementById('seasonalChart');
      if (ctx.chart) ctx.chart.destroy();
      ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [...months.map(m => `M${m}`), ...dayLabels],
          datasets: [
            { label: 'Monthly Avg CPU', data: monthVals.concat(Array(dayLabels.length).fill(null)), backgroundColor: 'steelblue' },
            { label: 'Weekly Avg CPU', data: Array(months.length).fill(null).concat(dayVals), backgroundColor: 'orange' }
          ]
        },
        options: { responsive: true, plugins: { tooltip: { enabled: true } }, scales: { x: { stacked: false } } }
      });
    } catch (e) {
      console.error('Error loading seasonal patterns:', e);
    }
  }

  // Load insights page
  async function loadInsights() {
    try {
      const res = await fetch(`${API}/insights${qs(filters())}`);
      const data = await res.json();
      document.getElementById('peakDates').innerHTML = (data.peak_demand_dates || []).map(d => `<li>${d.date} — ${Number(d.avg_cpu).toFixed(2)}</li>`).join('');
      document.getElementById('topRegions').innerHTML = (data.top_regions_by_growth || []).map(d => `<li>${d.region} — Δ ${Number(d.delta_avg_cpu).toFixed(2)}</li>`).join('');
      const ext = data.external_factor_correlation || {};
      document.getElementById('extImpact').innerHTML = ['economic_index','cloud_market_demand','holiday']
        .map(k => `<li>${k}: ${ext[k] != null ? Number(ext[k]).toFixed(3) : 'n/a'}</li>`).join('');

      // Load milestone 2 charts
      await loadComparisonBeforeAfter();
      await loadSeasonalPatterns();
    } catch (e) {
      console.error('Error loading insights:', e);
    }
  }

  // Load feature-engineered dataset table
  async function loadFeaturesTable() {
    try {
      const res = await fetch(`${API}/features${qs(filters())}`);
      const data = await res.json();
      renderTable('#featuresTable', data);
    } catch (e) {
      console.error('Error loading features table:', e);
    }
  }

  // Render table helper
  function renderTable(selector, rows) {
    const tHead = document.querySelector(selector + ' thead');
    const tBody = document.querySelector(selector + ' tbody');
    if (!rows || !rows.length) {
      tHead.innerHTML = '';
      tBody.innerHTML = '<tr><td>No data</td></tr>';
      return;
    }
    const cols = Object.keys(rows[0]);
    tHead.innerHTML = '<tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>';
    tBody.innerHTML = rows.map(r => '<tr>' + cols.map(c => `<td>${r[c] ?? ''}</td>`).join('') + '</tr>').join('');
  }

  // Get current filters from UI
  function filters(){
    return {
      date_from: fromDate.value || '',
      date_to: toDate.value || '',
      region: regionSelect.value || '',
      resource_type: rtypeSelect.value || ''
    };
  }

  // On Apply button click, reload all data and charts
  applyBtn.addEventListener('click', async () => {
    try {
      await Promise.all([loadOverview(), loadUsageTrends(), loadForecasts(), loadInsights(), loadFeaturesTable()]);
    } catch (e) {
      console.error('Error applying filters:', e);
    }
  });

  // Initialize page
  async function init(){
    try {
      await loadFilters();
      await Promise.all([loadOverview(), loadUsageTrends(), loadForecasts(), loadInsights(), loadFeaturesTable()]);
    } catch (e) {
      console.error('Error initializing page:', e);
    }
  }

  init();
});
