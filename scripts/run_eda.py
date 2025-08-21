import os
import pandas as pd
import matplotlib.pyplot as plt

RAW_PATH = "data/raw/azure_usage.csv"
OUT_CLEAN = "data/processed/cleaned_azure_usage.csv"
FIG_DIR = "reports/figures"
REPORT_MD = "reports/eda_report.md"

os.makedirs("data/processed", exist_ok=True)
os.makedirs(FIG_DIR, exist_ok=True)

# 1) Load
df = pd.read_csv(RAW_PATH)
print("✅ Loaded rows:", len(df))
print(df.head(3))

# 2) Normalize datetime column
date_col = None
for c in df.columns:
    if c.lower().strip() in ["date", "timestamp", "datetime"]:
        date_col = c
        break

if date_col is None:
    raise ValueError("No date/timestamp column found. Expected a column named date/timestamp/datetime.")

df[date_col] = pd.to_datetime(df[date_col])
df = df.sort_values(by=date_col)

# 3) Basic cleaning
missing_before = df.isnull().sum()
df = df.fillna(method="ffill").fillna(method="bfill")
missing_after = df.isnull().sum()

# 4) Ensure expected numeric columns exist (best-effort)
num_cols = []
for cand in ["usage_cpu", "usage_storage", "users_active"]:
    if cand in df.columns:
        num_cols.append(cand)

# 5) Visualizations
# 5a) Total CPU usage over time (if column exists)
if "usage_cpu" in df.columns:
    ax = df.groupby(df[date_col])["usage_cpu"].sum().plot(figsize=(10,4), title="Total CPU Usage Over Time")
    ax.figure.tight_layout()
    plt.savefig(f"{FIG_DIR}/cpu_usage_trend.png")
    plt.close()

# 5b) Region-wise average CPU (if region + usage_cpu exist)
if "region" in df.columns and "usage_cpu" in df.columns:
    ax = df.groupby("region")["usage_cpu"].mean().sort_values().plot(kind="bar", figsize=(10,4), title="Average CPU Usage by Region")
    ax.figure.tight_layout()
    plt.savefig(f"{FIG_DIR}/avg_cpu_by_region.png")
    plt.close()

# 5c) Correlation heatmap (if at least 2 numeric cols)
nums = df.select_dtypes(include="number")
if nums.shape[1] >= 2:
    import seaborn as sns
    import matplotlib.pyplot as plt
    plt.figure(figsize=(6,4))
    sns.heatmap(nums.corr(numeric_only=True), annot=True)
    plt.title("Correlation Heatmap")
    plt.tight_layout()
    plt.savefig(f"{FIG_DIR}/correlation_heatmap.png")
    plt.close()

# 6) Save cleaned data
df.to_csv(OUT_CLEAN, index=False)

# 7) EDA markdown report
with open(REPORT_MD, "w", encoding="utf-8") as f:
    f.write("# EDA Report – Milestone 1\n")
    f.write("## Datasets Used\n")
    f.write("- azure_usage.csv (raw)\n\n")
    f.write("## Row Count\n")
    f.write(f"- Rows loaded: {len(df)}\n\n")
    f.write("## Missing Values (before → after)\n")
    for c in missing_before.index:
        f.write(f"- {c}: {int(missing_before[c])} → {int(missing_after[c])}\n")
    f.write("\n## Visualizations\n")
    if os.path.exists(f"{FIG_DIR}/cpu_usage_trend.png"): f.write("- Total CPU usage trend over time (cpu_usage_trend.png)\n")
    if os.path.exists(f"{FIG_DIR}/avg_cpu_by_region.png"): f.write("- Average CPU usage by region (avg_cpu_by_region.png)\n")
    if os.path.exists(f"{FIG_DIR}/correlation_heatmap.png"): f.write("- Correlation heatmap (correlation_heatmap.png)\n")
    f.write("\n## Cleaned Output\n")
    f.write(f"- {OUT_CLEAN}\n")

print("✅ Cleaned CSV:", OUT_CLEAN)
print("✅ Figures saved to:", FIG_DIR)
print("✅ Report:", REPORT_MD)
