document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://127.0.0.1:5000/api';
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  let cpuChart, storageChart, comparisonChart, regionPie, usageTrendsChart, forecastChart;

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

  function qs(params) {
    const nonEmpty = Object.entries(params).filter(([_,v]) => v !== '' && v != null);
    return nonEmpty.length ? '?' + new URLSearchParams(Object.fromEntries(nonEmpty)).toString() : '';
  }

  async function loadFilters() {
    const res = await fetch(`${API}/regions`);
    const data = await res.json();
    regionSelect.innerHTML = '<option value="">All</option>' + (data.regions || []).map(r => `<option value="${r}">${r}</option>`).join('');
    rtypeSelect.innerHTML = '<option value="">All</option>' + (data.resource_types || []).map(r => `<option value="${r}">${r}</option>`).join('');
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

  // Utility
  function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
  function groupBy(arr, fn){ return arr.reduce((m, item)=>{ const k = fn(item); (m[k] ||= []).push(item); return m; }, {}); }

  // Rolling average helper
  function rollingAverage(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        result.push(null); // not enough data
      } else {
        let sum = 0;
        for (let j = i - windowSize + 1; j <= i; j++) {
          sum += data[j];
        }
        result.push(sum / windowSize);
      }
    }
    return result;
  }

  // Load overview charts
  async function loadOverview() {
    // CPU
    const cpuRes = await fetch(`${API}/cpu_usage${qs(filters())}`);
    const cpuData = await cpuRes.json();
    const dates = cpuData.map(d => d.date);
    const cpuVals = cpuData.map(d => d.usage_cpu);
    createLine('cpuUsageChart', dates, [{ label: 'CPU Usage (avg)', data: cpuVals, fill: true }]);

    // Storage
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
    const rollAvg = rollingAverage(rawAvg, 7);
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
  }

  // Load usage trends page
  async function loadUsageTrends() {
    const res = await fetch(`${API}/usage-trends${qs(filters())}`);
    const data = await res.json();
    if (!data.length) {
      document.getElementById('usageTrendsChart').getContext && document.getElementById('usageTrendsChart').getContext('2d').clearRect(0,0,1,1);
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
  }

  // Forecasts
  async function loadForecasts() {
    const days = 14;
    const res = await fetch(`${API}/recommendations?days=${days}`);
    const recs = await res.json();
    const labels = recs.map(r => r.date);
    const vals = recs.map(r => r.predicted_cpu_usage);
    createLine('forecastChart', labels, [{ label: 'Predicted CPU', data: vals, fill: true }]);
    document.getElementById('recoList').innerHTML = recs.map(r => `<li>${r.date}: ${r.predicted_cpu_usage} — ${r.recommendation}</li>`).join('');
  }

  // --- NEW: Before vs After Comparison ---
  async function loadComparisonBeforeAfter() {
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

    // Dual Y-Axis Chart
    const ctx = document.getElementById('beforeAfterChart');
    if (ctx.chart) ctx.chart.destroy();
    ctx.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Before (raw)',
            data: beforeAvg,
            borderColor: 'red',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            fill: false,
            yAxisID: 'y1'
          },
          {
            label: 'After (engineered)',
            data: afterAvg,
            borderColor: 'blue',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            fill: false,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top'
          },
          title: {
            display: true,
            text: 'Comparison: Before vs After Feature Engineering'
          }
        },
        scales: {
          y1: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Before (raw)'
            }
          },
          y2: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'After (engineered)'
            },
            grid: {
              drawOnChartArea: false // keep grids separate
            }
          }
        }
      }
    });
  }

  // --- NEW: Seasonal Patterns ---
  async function loadSeasonalPatterns() {
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
  }

  // Insights
  async function loadInsights() {
    const res = await fetch(`${API}/insights${qs(filters())}`);
    const data = await res.json();
    document.getElementById('peakDates').innerHTML = (data.peak_demand_dates || []).map(d => `<li>${d.date} — ${Number(d.avg_cpu).toFixed(2)}</li>`).join('');
    document.getElementById('topRegions').innerHTML = (data.top_regions_by_growth || []).map(d => `<li>${d.region} — Δ ${Number(d.delta_avg_cpu).toFixed(2)}</li>`).join('');
    const ext = data.external_factor_correlation || {};
    document.getElementById('extImpact').innerHTML = ['economic_index','cloud_market_demand','holiday']
      .map(k => `<li>${k}: ${ext[k] != null ? Number(ext[k]).toFixed(3) : 'n/a'}</li>`).join('');

    // Call new charts
    await loadComparisonBeforeAfter();
    await loadSeasonalPatterns();
  }

  // Features table
  async function loadFeaturesTable() {
    const res = await fetch(`${API}/features${qs(filters())}`);
    const data = await res.json();
    renderTable('#featuresTable', data);
  }

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

  function filters(){
    return {
      date_from: fromDate.value || '',
      date_to: toDate.value || '',
      region: regionSelect.value || '',
      resource_type: rtypeSelect.value || ''
    };
  }

  applyBtn.addEventListener('click', async () => {
    await Promise.all([loadOverview(), loadUsageTrends(), loadForecasts(), loadInsights(), loadFeaturesTable()]);
  });

  async function init(){
    await loadFilters();
    await Promise.all([loadOverview(), loadUsageTrends(), loadForecasts(), loadInsights(), loadFeaturesTable()]);
  }

  init();
});

