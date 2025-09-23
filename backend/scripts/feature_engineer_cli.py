import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROC_DIR = ROOT / "data" / "processed"
RAW_USAGE = RAW_DIR / "azure_usage.csv"
RAW_EXT = RAW_DIR / "external_factors.csv"
OUT_PATH = PROC_DIR / "feature_engineered.csv"

def engineer_features():
    # Load
    usage = pd.read_csv(RAW_USAGE, parse_dates=["date"])
    try:
        ext = pd.read_csv(RAW_EXT, parse_dates=["date"])
    except FileNotFoundError:
        ext = pd.DataFrame(columns=["date", "economic_index", "cloud_market_demand", "holiday"])
        ext["date"] = pd.to_datetime(ext["date"])

    # Basic cleaning
    usage = usage.drop_duplicates()
    usage["date"] = pd.to_datetime(usage["date"])
    usage = usage.sort_values(["region", "resource_type", "date"]).reset_index(drop=True)

    # Time features
    usage["day_of_week"] = usage["date"].dt.dayofweek  # Mon=0
    usage["month"] = usage["date"].dt.month
    usage["quarter"] = usage["date"].dt.quarter
    usage["is_weekend"] = usage["day_of_week"].isin([5,6]).astype(int)

    # Derived metrics - cpu_total as max observed per region+resource_type
    usage["cpu_total"] = usage.groupby(["region","resource_type"])["usage_cpu"].transform("max")
    usage["cpu_utilization_ratio"] = usage["usage_cpu"] / usage["cpu_total"].replace(0, np.nan)

    # Storage allocated proxy (peak per region+resource_type)
    usage["storage_allocated_proxy"] = usage.groupby(["region","resource_type"])["usage_storage"].transform("max")
    usage["storage_efficiency"] = usage["usage_storage"] / usage["storage_allocated_proxy"].replace(0, np.nan)

    # Lags for CPU usage (1,3,7 days)
    for lag in (1, 3, 7):
        usage[f"cpu_lag_{lag}"] = usage.groupby(["region","resource_type"])["usage_cpu"].shift(lag)

    # Rolling stats for cpu usage (7, 30)
    for win in (7, 30):
        grp = usage.groupby(["region","resource_type"])["usage_cpu"]
        usage[f"cpu_roll_mean_{win}"] = grp.transform(lambda s: s.rolling(window=win, min_periods=1).mean())
        usage[f"cpu_roll_max_{win}"] = grp.transform(lambda s: s.rolling(window=win, min_periods=1).max())
        usage[f"cpu_roll_min_{win}"] = grp.transform(lambda s: s.rolling(window=win, min_periods=1).min())

    # Merge external factors on date
    if not ext.empty:
        usage = usage.merge(ext, on="date", how="left")
    else:
        # Ensure columns exist
        usage["economic_index"] = np.nan
        usage["cloud_market_demand"] = np.nan
        usage["holiday"] = np.nan

    # Keep consistent column ordering (sensible)
    cols = [
        "date","region","resource_type","usage_cpu","usage_storage","users_active",
        "day_of_week","month","quarter","is_weekend",
        "cpu_total","cpu_utilization_ratio","storage_allocated_proxy","storage_efficiency",
        "cpu_lag_1","cpu_lag_3","cpu_lag_7",
        "cpu_roll_mean_7","cpu_roll_max_7","cpu_roll_min_7",
        "cpu_roll_mean_30","cpu_roll_max_30","cpu_roll_min_30",
        "economic_index","cloud_market_demand","holiday"
    ]
    # Keep only existing cols to avoid errors if some are missing
    cols = [c for c in cols if c in usage.columns]
    usage = usage[cols]

    PROC_DIR.mkdir(parents=True, exist_ok=True)
    usage.to_csv(OUT_PATH, index=False)
    print(f"Saved feature-engineered dataset to: {OUT_PATH}")
    return OUT_PATH

if __name__ == "__main__":
    engineer_features()
