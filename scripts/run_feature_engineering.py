import os
import pandas as pd

RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"

# Load Azure usage
azure = pd.read_csv(os.path.join(RAW_DIR, "azure_usage.csv"), parse_dates=["date"])
print("✅ Azure shape:", azure.shape)

# Load External factors
external = pd.read_csv(os.path.join(RAW_DIR, "external_factors.csv"), parse_dates=["date"])
print("✅ External shape:", external.shape)

# Clean missing values
azure = azure.ffill().bfill()
external = external.ffill().bfill()

# Merge on date only (no region in external dataset)
merged = pd.merge(azure, external, on="date", how="left")

print("✅ Merged shape:", merged.shape)

# -----------------------
# Feature Engineering
# -----------------------

# 1. Weekly average usage
merged["week"] = merged["date"].dt.isocalendar().week
weekly_avg = merged.groupby(["region", "week"])["usage_cpu"].mean().reset_index()
weekly_avg.rename(columns={"usage_cpu": "weekly_avg_cpu"}, inplace=True)
merged = merged.merge(weekly_avg, on=["region", "week"], how="left")

# 2. Rolling average demand (7-day)
merged["cpu_rolling_avg_7d"] = merged.groupby("region")["usage_cpu"].transform(lambda x: x.rolling(7, 1).mean())

# 3. Lag features (yesterday’s CPU usage)
merged["cpu_lag_1"] = merged.groupby("region")["usage_cpu"].shift(1)

# 4. Seasonality indicators
merged["month"] = merged["date"].dt.month
merged["quarter"] = merged["date"].dt.quarter

# Save final dataset
os.makedirs(PROCESSED_DIR, exist_ok=True)
output_file = os.path.join(PROCESSED_DIR, "final_features.csv")
merged.to_csv(output_file, index=False)

print(f"✅ Final dataset saved: {output_file}")
print("✅ Columns in final dataset:", merged.columns.tolist())
