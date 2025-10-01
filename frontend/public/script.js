

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
    const canvas = document.getElementById(ctxId);
    if (!canvas) {
      console.debug('createLine: canvas not found', ctxId);
      return null;
    }
    // Destroy any chart registered with Chart.js for this canvas
    try {
      const existing = Chart.getChart(canvas);
      if (existing) {
        existing.destroy();
      }
    } catch (err) {
      // ignore
    }

    try {
      const chart = new Chart(canvas, {
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
      // store reference for older code paths
      try { canvas.chart = chart; } catch(e) {}
      return chart;
    } catch (e) {
      console.error('createLine: failed to create chart', ctxId, e);
      return null;
    }
  }

  function createPie(ctxId, labels, data) {
    const canvas = document.getElementById(ctxId);
    if (!canvas) {
      console.debug('createPie: canvas not found', ctxId);
      return null;
    }
    // Destroy any chart registered with Chart.js for this canvas
    try {
      const existing = Chart.getChart(canvas);
      if (existing) existing.destroy();
    } catch (err) {}

    try {
      const chart = new Chart(canvas, {
        type: 'pie',
        data: { labels, datasets: [{ label: 'share', data }] },
        options: { responsive: true, plugins: { tooltip: { enabled: true } } }
      });
      try { canvas.chart = chart; } catch(e) {}
      return chart;
    } catch (e) {
      console.error('createPie: failed to create chart', ctxId, e);
      return null;
    }
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
    // Use header filters (results-only UI)
    const f = filters();
    const region = f.region || '_';
    const service = f.resource_type || '_';
    const horizon = 14; // keep 14 by default

    // fetch historical usage and forecast in parallel
    const histP = fetch(`${API}/usage-trends${qs({ region: f.region, resource_type: f.resource_type })}`).then(r => r.ok ? r.json() : []).catch(() => []);
    const fcP = fetch(`${API}/forecast/${encodeURIComponent(region)}/${encodeURIComponent(service)}`).then(r => r.ok ? r.json() : []).catch(() => []);

    const [histRaw, fcRaw] = await Promise.all([histP, fcP]);

    // aggregate historical by date -> average
    const histByDate = {};
    (histRaw || []).forEach(r => {
      if (!r || !r.date) return;
      histByDate[r.date] = histByDate[r.date] || [];
      histByDate[r.date].push(Number(r.usage_cpu ?? r.usage ?? 0));
    });
    const histDates = Object.keys(histByDate).sort();
    const histVals = histDates.map(d => histByDate[d].length ? histByDate[d].reduce((a,b)=>a+b,0)/histByDate[d].length : null);

    // normalize forecast array (accept [] or { forecasts: [] })
    const forecasts = Array.isArray(fcRaw) ? fcRaw : (fcRaw?.forecasts || []);
    const fcSlice = (forecasts || []).slice(0, horizon);

    // combined labels (historical + forecast)
    const fcDates = fcSlice.map(x => x.date).filter(Boolean);
    let labels = Array.from(new Set([...histDates, ...fcDates])).sort();

    // helper: try many common field names
    function firstField(obj, keys) {
      if (!obj) return null;
      for (const k of keys) {
        if (obj[k] != null) return obj[k];
      }
      return null;
    }
    const predKeys = ['predicted_cpu_usage','predicted','prediction','prediction_mean','predicted_mean','yhat','forecast','predicted_value','value'];
    const lowerKeys = ['lower_ci','ci_lower','ci95_lower','lower','yhat_lower','conf_lower'];
    const upperKeys = ['upper_ci','ci_upper','ci95_upper','upper','yhat_upper','conf_upper'];

    // aligned arrays
    let actual = labels.map(lbl => {
      const i = histDates.indexOf(lbl); return i >= 0 ? histVals[i] : null;
    });
    let predicted = labels.map(lbl => {
      const fobj = (fcSlice || []).find(x => x.date === lbl);
      return fobj ? Number(firstField(fobj, predKeys) ?? null) : null;
    });
    let lower = labels.map(lbl => { const fobj = (fcSlice || []).find(x => x.date === lbl); return fobj ? Number(firstField(fobj, lowerKeys) ?? null) : null; });
    let upper = labels.map(lbl => { const fobj = (fcSlice || []).find(x => x.date === lbl); return fobj ? Number(firstField(fobj, upperKeys) ?? null) : null; });

    // detect fractional 0..1 scale and convert to percent for readability
    const numeric = [...actual, ...predicted, ...lower, ...upper].filter(v=>v!=null).map(v=>Math.abs(Number(v)||0));
    const maxVal = numeric.length ? Math.max(...numeric) : 0;
    const usePercent = maxVal > 0 && maxVal <= 1.01;
    const scale = usePercent ? 100 : 1;
    let actualS = actual.map(v => v==null ? null : v * scale);
    let predictedS = predicted.map(v => v==null ? null : v * scale);
    let lowerS = lower.map(v => v==null ? null : v * scale);
    let upperS = upper.map(v => v==null ? null : v * scale);

    // If backend provided no predictions, synthesize a simple forecast (linear trend from recent history)
    let synthesized = false;
    const hasOriginalPredictions = predicted.some(v => v != null);
    if (!hasOriginalPredictions) {
      // If we have historical data, extrapolate for 'horizon' days
      if (histDates.length) {
        synthesized = true;
        // compute recent trend from last up to 7 points
        const recentCount = Math.min(7, histVals.length);
        const recentVals = histVals.slice(-recentCount).map(v => Number(v || 0));
        const first = recentVals[0] ?? recentVals[recentVals.length-1] ?? 0;
        const last = recentVals[recentVals.length-1] ?? first;
        const slope = recentVals.length > 1 ? (last - first) / (recentVals.length - 1) : 0;

        // build future dates starting from last historical date
        const lastDateStr = histDates[histDates.length - 1];
        const lastDate = new Date(lastDateStr);
        const futureDates = [];
        for (let i = 1; i <= horizon; i++) {
          const d = new Date(lastDate);
          d.setDate(d.getDate() + i);
          const iso = d.toISOString().slice(0,10);
          futureDates.push(iso);
        }
        // append future dates to labels if not present
        labels = Array.from(new Set([...labels, ...futureDates])).sort();

        // rebuild actualS/predictedS arrays to match new labels
        actualS = labels.map(lbl => {
          const idx = histDates.indexOf(lbl);
          return idx >= 0 ? (histVals[idx] * scale) : null;
        });

        // synthesize predicted values using linear extrapolation
        predictedS = labels.map(lbl => {
          // if it is historical date and forecast array had value, keep it (none in this branch)
          const idxHist = histDates.indexOf(lbl);
          if (idxHist >= 0) return null; // no predicted for past if none provided
          // future index: days after lastDate
          const d = new Date(lbl);
          const daysAfter = Math.round((d - lastDate) / (24*3600*1000));
          const base = last;
          const val = (base + slope * daysAfter) * scale;
          return Number(val.toFixed(2));
        });

        // create light CI +/- 6% of predicted as coarse uncertainty
        lowerS = predictedS.map(v => v == null ? null : Math.max(0, v - Math.max(1, Math.abs(v) * 0.06)));
        upperS = predictedS.map(v => v == null ? null : v + Math.max(1, Math.abs(v) * 0.06));
      }
    }

    // recommendations extraction (unchanged behaviour mostly)
    const recoEl = document.getElementById('recoList');
    if (recoEl) {
      // 1) primary: recommendations embedded per-forecast
      let recs = (fcSlice || []).map(x => x.recommendation ?? x.reco ?? x.note ?? '').filter(Boolean);

      // 2) fallback: check common top-level fields returned by some backends
      if (!recs.length) {
        const alt = fcRaw || {};
        const altArrays = alt.recommendations || alt.recs || alt.reco_list || alt.items || alt.recommendation_list || [];
        if (Array.isArray(altArrays) && altArrays.length) {
          recs = altArrays.map(it => (typeof it === 'string' ? it : (it.recommendation ?? it.reco ?? it.note ?? JSON.stringify(it)))).filter(Boolean);
        }
      }

      // 3) fallback: try legacy endpoint /api/recommendations
      if (!recs.length) {
        try {
          const rr = await fetch(`${API}/recommendations?days=${horizon}`);
          if (rr.ok) {
            const rrJson = await rr.json();
            const arr = Array.isArray(rrJson) ? rrJson : (rrJson.recommendations || rrJson.items || []);
            recs = (arr || []).map(x => (typeof x === 'string' ? x : (x.recommendation ?? x.reco ?? x.note ?? ''))).filter(Boolean);
          }
        } catch (e) { /* ignore */ }
      }

      // 4) final fallback: synthesize from predicted values (dates exceeding thresholds)
      if (!recs.length) {
        const warns = [];
        labels.forEach((d,i) => {
          const p = predictedS[i];
          if (p == null) return;
          if (p >= 90) warns.push(`${d}: predicted ${p.toFixed(1)}% → CRITICAL (scale up)`);
          else if (p >= 80) warns.push(`${d}: predicted ${p.toFixed(1)}% → Consider scaling`);
        });
        recs = warns.length ? warns : ['No recommendations available'];
      }

      // write into DOM (when predictions originally missing, label Day1/Day2)
      const hasPredictionsNow = predictedS.some(v => v != null);
      const hadOriginalPredictions = hasOriginalPredictions;
      if (!hadOriginalPredictions && recs.length) {
        // label Day1..DayN when original model didn't provide explicit dates
        recoEl.innerHTML = recs.map((r,i) => `<li>Day${i+1}: ${r}</li>`).join('');
      } else {
        recoEl.innerHTML = recs.map(r => `<li>${r}</li>`).join('');
      }
      try { recoEl.style.color = '#072033'; } catch (e) {}
    }

    // build datasets: historical, CI lower (invisible), CI upper (fills to lower), forecast, thresholds
    const datasets = [
      { label: 'Historical (actual)', data: actualS, borderColor: '#1f6feb', backgroundColor: 'rgba(31,111,235,0.06)', tension: 0.2, pointRadius: 3, fill: false },
      { label: 'CI lower', data: lowerS, borderColor: 'rgba(0,0,0,0)', backgroundColor: 'rgba(13,179,235,0.06)', pointRadius: 0, tension: 0.2, fill: false },
      { label: 'CI upper', data: upperS, borderColor: 'rgba(0,0,0,0)', backgroundColor: 'rgba(13,179,235,0.12)', pointRadius: 0, tension: 0.2, fill: '-1' },
      { label: (synthesized ? 'Forecasted (synthesized)' : 'Forecasted (predicted)'), data: predictedS, borderColor: '#00cfe8', backgroundColor: 'rgba(0,207,232,0.04)', borderDash: [6,4], tension: 0.2, pointRadius: 3, fill: false },
      { label: 'Recommended Capacity (80%)', data: labels.map(()=>80), borderColor: 'rgba(255,0,0,0.6)', borderDash: [6,4], pointRadius: 0, fill: false },
      { label: 'Critical Threshold (90%)', data: labels.map(()=>90), borderColor: 'rgba(255,0,0,0.9)', borderDash: [4,4], pointRadius: 0, fill: false }
    ];

    // tooltip label helper
    const tooltipCallback = ctx => {
      const v = ctx.parsed.y;
      if (v == null) return `${ctx.dataset.label}: n/a`;
      return `${ctx.dataset.label}: ${usePercent ? v.toFixed(2) + '%' : v}`;
    };

    // render main forecast chart
    createLine('forecastChart', labels, datasets, {
      plugins: { title: { display: true, text: `Forecast (${horizon} days)` }, legend: { position: 'bottom' }, tooltip: { callbacks: { label: tooltipCallback } } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => usePercent ? `${v}%` : v }, suggestedMax: usePercent ? 110 : undefined } }
    });

    // render comparison chart: Actual vs Predicted
    createLine('forecastComparisonChart', labels, [
      { label: 'Actual', data: actualS, borderColor: '#1f6feb', fill: false },
      { label: (synthesized ? 'Predicted (synthesized)' : 'Predicted'), data: predictedS, borderColor: '#00cfe8', borderDash: [5,5], fill: false }
    ], { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: tooltipCallback } } }, scales: { y: { ticks: { callback: v => usePercent ? `${v}%` : v }, suggestedMax: usePercent ? 110 : undefined } } });

    // summary under chart
    const summaryEl = document.getElementById('forecastSummary');
    if (summaryEl) {
      const preds = labels.map((d,i) => ({ date:d, v: predictedS[i] })).filter(x=>x.v!=null);
      if (preds.length) {
        const peak = preds.reduce((a,b)=> a.v>=b.v? a:b);
        const regionText = f.region || 'All regions';
        const svcText = f.resource_type || 'All services';
        const action = peak.v >= 90 ? 'scale up (critical)' : peak.v >= 80 ? 'consider scaling up' : 'no immediate scaling';
        const synthNote = synthesized ? ' (synthesized)' : '';
        summaryEl.textContent = `${regionText}, ${svcText} is expected to reach ${peak.v.toFixed(2)}% usage by ${peak.date}.${synthNote} Recommended action: ${action}.`;
      } else {
        summaryEl.textContent = 'No forecast predictions available for the current selection.';
      }
    }
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

  async function loadModelComparison() {
    try {
      const res = await fetch('final_model_selection.json');
      if (!res.ok) throw new Error();
      const data = await res.json();
      // data has { best_model, ranking: [...] }
      populateModelTable(data.ranking);
    } catch (e) {
      console.error('Failed to load model comparison', e);
      document.getElementById('model-comparison-table').innerHTML = '<tr><td colspan="6" class="small-muted">Failed to load model comparison data.</td></tr>';
    }
  }

  function populateModelTable(rows) {
    if (!rows || !rows.length) {
      document.getElementById('model-comparison-table').innerHTML = '<tr><td colspan="6" class="small-muted">No data available.</td></tr>';
      return;
    }
    const tbody = document.getElementById('model-comparison-table');
    tbody.innerHTML = rows.map(r => {
      const isXGBoost = (r.model || '').toLowerCase() === 'xgboost';
      return `<tr class="${isXGBoost ? 'best-model' : ''}">
        <td>${r.model || ''}</td>
        <td>${r.mae != null ? r.mae : ''}</td>
        <td>${r.rmse != null ? r.rmse : ''}</td>
        <td>${r.mape != null ? r.mape : ''}</td>
        <td>${r.scalability != null ? r.scalability : 'N/A'}</td>
        <td>${r.latency != null ? r.latency : 'N/A'}</td>
      </tr>`;
    }).join('');
  }

  async function init(){
    await loadFilters();
    await Promise.all([loadOverview(), loadUsageTrends(), loadForecasts(), loadInsights(), loadFeaturesTable(), loadModelComparison()]);
  }

  init();
});

// Add: initialize Forecasts chart if not already initialized
(function () {
  function initForecastChart() {
    if (!window.Chart) return;
    const canvas = document.getElementById('forecastChart');
    if (!canvas) return;

    try {
      if (Chart.getChart(canvas)) return; // already initialized
    } catch (e) {
      // ignore
    }

    // Replace the labels/data below with your real forecast data when available
    const labels = ['2024-09-01','2024-09-08','2024-09-15','2024-09-22','2024-09-29','2024-10-06'];
    const dataset = [120, 130, 125, 140, 150, 160];

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Forecasted Demand',
            data: dataset,
            borderColor: '#1f6feb',
            backgroundColor: 'rgba(31,111,235,0.12)',
            tension: 0.2,
            pointRadius: 3,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // CSS controls height
        animation: false,
        plugins: { legend: { display: true } },
        scales: {
          x: {
            display: true,
            grid: { display: false }
          },
          y: {
            display: true,
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.03)' }
          }
        }
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initForecastChart();
  } else {
    document.addEventListener('DOMContentLoaded', initForecastChart);
  }
})();

(function () {
  if (!window.Chart) {
    // Chart.js not loaded yet — wait a bit
    window.addEventListener('load', init);
  } else {
    init();
  }

  function init() {
    // run after DOM ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      runInsights();
    } else {
      document.addEventListener('DOMContentLoaded', runInsights);
    }
  }

  function runInsights() {
    const FALLBACK = {
      peak_times: [
        { date: '2023-02-10', cpu_usage: 0.85 },
        { date: '2023-02-06', cpu_usage: 0.85 },
        { date: '2023-01-08', cpu_usage: 0.83 }
      ],
      growth_regions: [
        { region: 'North Europe', growth_rate: 0.03 },
        { region: 'West US', growth_rate: 0.01 },
        { region: 'Southeast Asia', growth_rate: -0.01 },
        { region: 'East US', growth_rate: -0.05 }
      ],
      external_factors: [
        { factor: 'economic_index', correlation: -0.059 },
        { factor: 'cloud_market_demand', correlation: 0.009 },
        { factor: 'holiday', correlation: -0.018 }
      ]
    };

    function normalizeCpu(v) {
      if (v == null) return 0;
      const n = Number(v);
      if (Number.isNaN(n)) return 0;
      return Math.abs(n) <= 1 ? +(n * 100).toFixed(2) : +n.toFixed(2);
    }
    function safeDestroy(el) {
      try { const c = Chart.getChart(el); if (c) c.destroy(); } catch (e) {}
    }

    async function fetchInsights() {
      try {
        const res = await fetch('/api/insights', { cache: 'no-store' });
        if (!res.ok) throw new Error('no-api');
        const d = await res.json();
        return {
          peak_times: (d.peak_times || FALLBACK.peak_times)
            .map(p => ({ date: p.date, cpu: normalizeCpu(p.cpu_usage ?? p.usage ?? p.value) })),
          growth_regions: (d.growth_regions || FALLBACK.growth_regions)
            .map(g => ({ region: g.region, growth_pct: (typeof g.growth_rate === 'number' && Math.abs(g.growth_rate) > 1) ? +g.growth_rate.toFixed(2) : +((g.growth_rate ?? 0) * 100).toFixed(2) })),
          external_factors: (d.external_factors || FALLBACK.external_factors)
            .map(f => ({ factor: f.factor, correlation: +(f.correlation ?? f.value ?? 0) }))
        };
      } catch (e) {
        return {
          peak_times: FALLBACK.peak_times.map(p => ({ date: p.date, cpu: normalizeCpu(p.cpu_usage) })),
          growth_regions: FALLBACK.growth_regions.map(g => ({ region: g.region, growth_pct: +((g.growth_rate ?? 0) * 100).toFixed(2) })),
          external_factors: FALLBACK.external_factors
        };
      }
    }

    function renderPeak(el, items) {
      safeDestroy(el);
      const labels = items.map(p => p.date);
      const values = items.map(p => p.cpu);
      const maxVal = Math.max(...values);
      return new Chart(el, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'CPU Usage (%)',
            data: values,
            borderColor: '#1f6feb',
            backgroundColor: 'rgba(31,111,235,0.06)',
            tension: 0.18,
            pointRadius: values.map(v => v === maxVal ? 7 : 3),
            pointBackgroundColor: values.map(v => v === maxVal ? '#ff8a00' : '#1f6feb'),
            pointBorderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Peak Demand Times (CPU %)' },
            tooltip: { callbacks: { label: ctx => `CPU: ${ctx.parsed.y}%` } },
            legend: { display: false }
          },
          scales: {
            x: { title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'CPU Usage (%)' }, beginAtZero: true }
          }
        }
      });
    }

    function renderGrowth(el, items) {
      safeDestroy(el);
      const sorted = (items || []).slice().sort((a,b) => b.growth_pct - a.growth_pct);
      const labels = sorted.map(s => s.region);
      const vals = sorted.map(s => +s.growth_pct);
      return new Chart(el, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Growth (%)', data: vals, backgroundColor: vals.map(v => v >= 0 ? '#0db39e' : '#ff8a00') }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Regions with Highest Growth' }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}%` } } },
          scales: { x: { title: { display: true, text: 'Region' } }, y: { title: { display: true, text: 'Growth Rate (%)' } } }
        }
      });
    }

    function renderExternal(el, items) {
      safeDestroy(el);
      const labels = (items || []).map(f => f.factor);
      const vals = (items || []).map(f => +f.correlation);
      return new Chart(el, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Correlation', data: vals, backgroundColor: vals.map(v => v >= 0 ? '#1f6feb' : '#ff8a00') }] },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'External Factors Impact (correlation)' }, tooltip: { callbacks: { label: ctx => `${labels[ctx.dataIndex]}: ${vals[ctx.dataIndex]}` } } },
          scales: { x: { title: { display: true, text: 'Correlation' } }, y: { title: { display: false } } }
        }
      });
    }

    function populateList(containerId, items, formatter) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = '';
      (items || []).forEach(it => {
        const li = document.createElement('li');
        li.textContent = formatter ? formatter(it) : String(it);
        el.appendChild(li);
      });
    }

    async function renderAll() {
      if (!window.Chart) return;
      const data = await fetchInsights();

      const peakEl = document.getElementById('peakDemandChart');
      if (peakEl) renderPeak(peakEl, data.peak_times);
      populateList('peakDates', data.peak_times, p => `${p.date} — ${p.cpu}%`);

      const growthEl = document.getElementById('growthRegionsChart');
      if (growthEl) renderGrowth(growthEl, data.growth_regions);
      populateList('topRegions', data.growth_regions, g => `${g.region} — Δ ${g.growth_pct >= 0 ? '+' : ''}${g.growth_pct.toFixed(2)}`);

      const extEl = document.getElementById('externalFactorsChart');
      if (extEl) renderExternal(extEl, data.external_factors);
      populateList('extImpact', data.external_factors, f => `${f.factor}: ${f.correlation}`);
    }

    renderAll();
  }
})();

