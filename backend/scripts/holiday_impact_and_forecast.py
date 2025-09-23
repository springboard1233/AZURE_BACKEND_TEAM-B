#!/usr/bin/env python3
"""
Holiday Impact on User Engagement & Resource Usage Forecast

This script analyzes holiday impact on user engagement and forecasts resource usage
with holiday effects incorporated as exogenous regressors.
"""

import argparse
import os
from typing import List, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.seasonal import seasonal_decompose
import warnings
warnings.filterwarnings('ignore')


# -------------------------------
# CONFIG CLASSES
# -------------------------------


class EngagementConfig:
    def __init__(self, timestamp_col: str, user_col: str, event_count_col: Optional[str], freq: str):
        self.timestamp_col = timestamp_col
        self.user_col = user_col
        self.event_count_col = event_count_col
        self.freq = freq


class ForecastConfig:
    def __init__(self, timestamp_col: str, metric_cols: List[str], freq: str,
                 order: tuple, seasonal_order: tuple, holiday_window: int, forecast_steps: int):
        self.timestamp_col = timestamp_col
        self.metric_cols = metric_cols
        self.freq = freq
        self.order = order
        self.seasonal_order = seasonal_order
        self.holiday_window = holiday_window
        self.forecast_steps = forecast_steps


# -------------------------------
# UTILITY FUNCTIONS
# -------------------------------


def _ensure_dir(path: str) -> None:
    """Ensure directory exists."""
    os.makedirs(path, exist_ok=True)


def load_holidays(holidays_csv: str) -> pd.DataFrame:
    """Load holidays CSV and convert dates."""
    holidays = pd.read_csv(holidays_csv)
    holidays['date'] = pd.to_datetime(holidays['date'])
    return holidays


def compute_engagement_kpis(events: pd.DataFrame, cfg: EngagementConfig) -> pd.DataFrame:
    """Compute daily engagement KPIs: DAU, total events, avg events per user."""
    # Convert timestamp
    events[cfg.timestamp_col] = pd.to_datetime(events[cfg.timestamp_col])

    # Aggregate events
    if cfg.event_count_col:
        events['event_count'] = events[cfg.event_count_col]
    else:
        events['event_count'] = 1

    # Group by date and user
    daily_user_events = events.groupby([
        pd.Grouper(key=cfg.timestamp_col, freq=cfg.freq),
        cfg.user_col
    ])['event_count'].sum().reset_index()

    # Compute KPIs
    kpis = daily_user_events.groupby(cfg.timestamp_col).agg({
        cfg.user_col: 'nunique',  # DAU
        'event_count': 'sum'      # Total events
    }).rename(columns={
        cfg.user_col: 'dau',
        'event_count': 'total_events'
    })

    # Avg events per user
    kpis['avg_events_per_user'] = kpis['total_events'] / kpis['dau']

    return kpis


def build_engagement_report(kpis: pd.DataFrame, holidays: pd.DataFrame,
                          outdir: str, window_days: int = 2) -> pd.DataFrame:
    """Build holiday impact report by comparing holidays vs baseline."""
    # Create holiday periods
    holiday_periods = []
    for _, holiday in holidays.iterrows():
        start = holiday['date'] - pd.Timedelta(days=window_days)
        end = holiday['date'] + pd.Timedelta(days=window_days)
        holiday_periods.append(pd.date_range(start, end))

    # Flatten holiday dates
    holiday_dates = pd.DatetimeIndex([date for period in holiday_periods for date in period])

    # Mark holiday vs non-holiday periods
    kpis['is_holiday'] = kpis.index.isin(holiday_dates)
    kpis['holiday_name'] = None

    # Assign holiday names
    for _, holiday in holidays.iterrows():
        mask = (kpis.index >= holiday['date'] - pd.Timedelta(days=window_days)) & \
               (kpis.index <= holiday['date'] + pd.Timedelta(days=window_days))
        kpis.loc[mask, 'holiday_name'] = holiday['name']

    # Compute baseline (non-holiday weekdays)
    baseline = kpis[~kpis['is_holiday'] & (kpis.index.weekday < 5)]  # Monday=0, Friday=4

    # Compute holiday impact for each metric
    summary_data = []
    for metric in ['dau', 'total_events', 'avg_events_per_user']:
        holiday_mean = kpis[kpis['is_holiday']][metric].mean()
        baseline_mean = baseline[metric].mean()

        impact_pct = ((holiday_mean - baseline_mean) / baseline_mean) * 100 if baseline_mean > 0 else 0

        summary_data.append({
            'metric': metric,
            'holiday_mean': holiday_mean,
            'baseline_mean': baseline_mean,
            'impact_percentage': impact_pct
        })

    summary = pd.DataFrame(summary_data)

    # Create charts
    _plot_engagement_kpis(kpis, holidays, outdir)

    return summary


def _plot_engagement_kpis(kpis: pd.DataFrame, holidays: pd.DataFrame, outdir: str) -> None:
    """Plot engagement KPIs with holiday markers."""
    fig, axes = plt.subplots(3, 1, figsize=(12, 10))

    metrics = ['dau', 'total_events', 'avg_events_per_user']
    titles = ['Daily Active Users', 'Total Events', 'Avg Events per User']

    for i, (metric, title) in enumerate(zip(metrics, titles)):
        axes[i].plot(kpis.index, kpis[metric], label='Actual')

        # Mark holidays
        holiday_dates = kpis[kpis['is_holiday']].index
        axes[i].scatter(holiday_dates, kpis.loc[holiday_dates, metric],
                       color='red', label='Holiday Period', zorder=5)

        axes[i].set_title(title)
        axes[i].legend()
        axes[i].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(outdir, 'engagement_kpis.png'), dpi=150, bbox_inches='tight')
    plt.close()


def run_resource_forecasts(resources: pd.DataFrame, cfg: ForecastConfig,
                          holidays: pd.DataFrame, outdir: str) -> None:
    """Run SARIMAX forecasts for resource metrics with holiday effects."""
    # Prepare timestamp
    resources[cfg.timestamp_col] = pd.to_datetime(resources[cfg.timestamp_col])
    resources = resources.set_index(cfg.timestamp_col)

    # Create holiday exogenous variables
    holiday_dates = holidays['date'].tolist()
    resources['is_holiday'] = resources.index.isin(holiday_dates).astype(int)

    # Add holiday window effect
    for days in range(1, cfg.holiday_window + 1):
        resources[f'holiday_lag_{days}'] = resources.index.isin(
            [d + pd.Timedelta(days=days) for d in holiday_dates] +
            [d - pd.Timedelta(days=days) for d in holiday_dates]
        ).astype(int)

    # Exogenous variables for holidays
    exog_cols = ['is_holiday'] + [f'holiday_lag_{i}' for i in range(1, cfg.holiday_window + 1)]
    exog = resources[exog_cols]

    for metric in cfg.metric_cols:
        print(f"Forecasting {metric}...")

        # Prepare series
        series = pd.to_numeric(resources[metric], errors='coerce').fillna(method='ffill')

        # Fit SARIMAX model
        model = SARIMAX(series, exog=exog, order=cfg.order, seasonal_order=cfg.seasonal_order)
        results = model.fit(disp=False)

        # Forecast
        forecast = results.get_forecast(steps=cfg.forecast_steps, exog=exog.tail(cfg.forecast_steps))
        forecast_mean = forecast.predicted_mean
        forecast_ci = forecast.conf_int()

        # Create forecast dataframe
        forecast_df = pd.DataFrame({
            'forecast': forecast_mean,
            'lower_ci': forecast_ci.iloc[:, 0],
            'upper_ci': forecast_ci.iloc[:, 1]
        })

        # Save forecast
        forecast_df.to_csv(os.path.join(outdir, f'forecast_{metric}.csv'))

        # Plot forecast
        _plot_forecast(series, forecast_df, metric, outdir)


def _plot_forecast(historical: pd.Series, forecast: pd.DataFrame, metric: str, outdir: str) -> None:
    """Plot historical data and forecast with confidence intervals."""
    plt.figure(figsize=(12, 6))

    # Historical data
    plt.plot(historical.index, historical.values, label='Historical', color='blue')

    # Forecast
    forecast_index = pd.date_range(start=historical.index[-1] + pd.Timedelta(days=1),
                                  periods=len(forecast), freq='D')
    plt.plot(forecast_index, forecast['forecast'], label='Forecast', color='red')
    plt.fill_between(forecast_index, forecast['lower_ci'], forecast['upper_ci'],
                    color='red', alpha=0.3, label='95% Confidence Interval')

    plt.title(f'{metric.upper()} Forecast with Holiday Effects')
    plt.xlabel('Date')
    plt.ylabel(metric.upper())
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.xticks(rotation=45)

    plt.tight_layout()
    plt.savefig(os.path.join(outdir, f'forecast_{metric}.png'), dpi=150, bbox_inches='tight')
    plt.close()


# -------------------------------
# CLI
# -------------------------------


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Holiday Engagement Impact & Resource Forecast")

    # Engagement inputs
    p.add_argument('--engagement_csv', type=str, help='CSV of raw events with timestamp and user columns')
    p.add_argument('--engagement_timestamp_col', type=str, default='timestamp')
    p.add_argument('--engagement_user_col', type=str, default='user_id')
    p.add_argument('--engagement_event_count_col', type=str, default=None)
    p.add_argument('--engagement_freq', type=str, default='D', help='Aggregation frequency, e.g., D or H')

    # Resource inputs
    p.add_argument('--resource_csv', type=str, help='CSV of resource metrics with timestamp + metric columns')
    p.add_argument('--resource_timestamp_col', type=str, default='timestamp')
    p.add_argument('--metric_cols', type=str, nargs='+', default=None, help='List of metric columns to forecast')
    p.add_argument('--resource_freq', type=str, default='D')

    # Holidays
    p.add_argument('--holidays_csv', type=str, required=True, help="CSV with columns: date,name")
    p.add_argument('--holiday_window', type=int, default=2, help='+/- K days around holidays to consider')

    # Forecast config
    p.add_argument('--order', type=int, nargs=3, default=(1,1,1))
    p.add_argument('--seasonal_order', type=int, nargs=4, default=(1,1,1,7))
    p.add_argument('--forecast_steps', type=int, default=14)

    # Outputs
    p.add_argument('--outdir', type=str, default='outputs')

    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> None:
    args = parse_args(argv)
    _ensure_dir(args.outdir)

    holidays = load_holidays(args.holidays_csv)

    # 1) Engagement Impact
    if args.engagement_csv:
        events = pd.read_csv(args.engagement_csv)
        kpis = compute_engagement_kpis(events, EngagementConfig(
            timestamp_col=args.engagement_timestamp_col,
            user_col=args.engagement_user_col,
            event_count_col=args.engagement_event_count_col,
            freq=args.engagement_freq,
        ))
        kpis.to_csv(os.path.join(args.outdir, 'engagement_kpis.csv'))
        summary = build_engagement_report(kpis, holidays, outdir=args.outdir, window_days=args.holiday_window)
        summary.to_csv(os.path.join(args.outdir, 'holiday_impact_summary.csv'), index=False)
        print(f"[OK] Engagement impact written to {args.outdir}")
    else:
        print("[INFO] --engagement_csv not provided; skipping engagement analysis.")

    # 2) Resource Forecasts
    if args.resource_csv and args.metric_cols:
        resources = pd.read_csv(args.resource_csv)
        run_resource_forecasts(resources, ForecastConfig(
            timestamp_col=args.resource_timestamp_col,
            metric_cols=args.metric_cols,
            freq=args.resource_freq,
            order=tuple(args.order),
            seasonal_order=tuple(args.seasonal_order),
            holiday_window=args.holiday_window,
            forecast_steps=args.forecast_steps,
        ), holidays=holidays, outdir=args.outdir)
        print(f"[OK] Resource forecasts written to {args.outdir}")
    else:
        print("[INFO] --resource_csv or --metric_cols not provided; skipping resource forecasts.")


if __name__ == '__main__':
    main()
