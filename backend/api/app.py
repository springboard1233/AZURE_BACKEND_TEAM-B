# backend/api/app.py
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
from pathlib import Path
import json
import datetime

app = Flask(__name__)
CORS(app)

BASE = Path(__file__).resolve().parents[1]
DATA = BASE / "data"
RAW = DATA / "raw"
PROC = DATA / "processed"
FEATURE_CSV = PROC / "feature_engineered.csv"
CLEANED_MERGED = PROC / "cleaned_merged.csv"  # milestone1 cleaned file if present

# Optional: import capacity recommendations generator (simple)
try:
    from ..models.capacity_planner import capacity_recommendations
except Exception:
    # fallback simple
    def capacity_recommendations(days=7, region=None, resource_type=None):
        # ignoring filters in fallback
        return [{"date": f"Day {i+1}", "predicted_cpu_usage": 60 + i*2, "recommendation": "Scale up" if i % 2 == 0 else "Scale down"} for i in range(days)]

# Helpers
def _load_features():
    if FEATURE_CSV.exists():
        df = pd.read_csv(FEATURE_CSV, parse_dates=["date"], dayfirst=False)
        return df
    return pd.DataFrame()

def _load_cleaned():
    if CLEANED_MERGED.exists():
        return pd.read_csv(CLEANED_MERGED, parse_dates=["date"])
    # fallback: try merged.csv or processed/merged.csv
    alt = PROC / "merged.csv"
    if alt.exists():
        return pd.read_csv(alt, parse_dates=["date"])
    return pd.DataFrame()

# -------------------------
# Basic endpoints
# -------------------------
@app.route("/api/ping")
def ping():
    return jsonify({"status": "ok", "time": datetime.datetime.utcnow().isoformat()})

# Milestone 1 endpoints
@app.route("/api/raw-data")
def raw_data():
    df = _load_cleaned()
    if df.empty:
        # try reading raw azure usage
        azure = RAW / "azure_usage.csv"
        if azure.exists():
            df = pd.read_csv(azure, parse_dates=["date"])
        else:
            return jsonify({"message":"no data found"}), 404
    # Optionally apply pagination/limit
    return jsonify(df.to_dict(orient="records"))

@app.route("/api/usage-trends")
def usage_trends():
    df = _load_cleaned()
    if df.empty:
        # try features file
        df = _load_features()
        if df.empty:
            return jsonify([])

    region = request.args.get("region")
    rtype = request.args.get("resource_type")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    if region:
        df = df[df["region"] == region]
    if rtype:
        df = df[df["resource_type"] == rtype]
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]

    res = df.groupby(["date","region"])["usage_cpu"].mean().reset_index()
    res["date"] = res["date"].dt.strftime("%Y-%m-%d")
    return jsonify(res.to_dict(orient="records"))

@app.route("/api/top-regions")
def top_regions():
    df = _load_cleaned()
    if df.empty:
        df = _load_features()
        if df.empty:
            return jsonify([])

    n = int(request.args.get("n", 5))
    by_region = df.groupby("region")["usage_cpu"].mean().sort_values(ascending=False).head(n)
    return jsonify([{"region": r, "avg_cpu": float(v)} for r, v in by_region.items()])

# Milestone 2 endpoints
@app.route("/api/features")
def features():
    df = _load_features()
    if df.empty:
        return jsonify([])

    # filters
    region = request.args.get("region")
    rtype = request.args.get("resource_type")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    if region:
        df = df[df["region"] == region]
    if rtype:
        df = df[df["resource_type"] == rtype]
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]

    print(f"[API] /api/features filtered data shape: {df.shape}")
    print(f"[API] Sample usage_cpu values: {df['usage_cpu'].head(5).tolist()}")
    
    df = df.sort_values("date")

    # Ensure sorting by date within groups before rolling
    df = df.sort_values(["region", "resource_type", "date"])

    # Compute rolling means for usage_cpu to provide variation in frontend chart
    df["usage_cpu_roll_mean_3"] = df.groupby(["region", "resource_type"])["usage_cpu"].transform(lambda x: x.rolling(window=3, min_periods=1).mean())
    df["usage_cpu_roll_mean_7"] = df.groupby(["region", "resource_type"])["usage_cpu"].transform(lambda x: x.rolling(window=7, min_periods=1).mean())

    print(f"[API] Sample rolling mean 7 values: {df['usage_cpu_roll_mean_7'].head(5).tolist()}")

    # Add day_of_week column for weekly variation (0=Monday, 6=Sunday)
    df["day_of_week"] = df["date"].dt.dayofweek

    # Convert datetimes to ISO strings for JSON
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    return jsonify(df.to_dict(orient="records"))

@app.route("/api/insights")
def insights():
    df = _load_features()
    if df.empty:
        return jsonify({})

    # Filters optional
    region = request.args.get("region")
    rtype = request.args.get("resource_type")
    if region:
        df = df[df["region"] == region]
    if rtype:
        df = df[df["resource_type"] == rtype]

    # Peak demand dates (top 3 by mean CPU)
    by_date = df.groupby("date")["usage_cpu"].mean().sort_values(ascending=False)
    peak_dates = [{"date": d.strftime("%Y-%m-%d"), "avg_cpu": float(v)} for d, v in by_date.head(3).items()]

    # Regions with highest growth: last 30 vs previous 30
    last_date = df["date"].max()
    w1 = df[df["date"] > last_date - pd.Timedelta(days=30)]
    w0 = df[(df["date"] <= last_date - pd.Timedelta(days=30)) & (df["date"] > last_date - pd.Timedelta(days=60))]
    g1 = w1.groupby("region")["usage_cpu"].mean()
    g0 = w0.groupby("region")["usage_cpu"].mean()
    growth = (g1 - g0).fillna(0).sort_values(ascending=False)
    top_growth = [{"region": k, "delta_avg_cpu": float(v)} for k, v in growth.head(5).items()]

    # External factor quick correlations
    corr_econ = df["usage_cpu"].corr(df["economic_index"]) if "economic_index" in df.columns else None
    corr_market = df["usage_cpu"].corr(df["cloud_market_demand"]) if "cloud_market_demand" in df.columns else None
    corr_holiday = df["usage_cpu"].corr(df["holiday"]) if "holiday" in df.columns else None

    # Seasonal patterns (monthly)
    monthly = df.groupby("month")["usage_cpu"].mean().to_dict()

    kpis = {
        "peak_demand_dates": peak_dates,
        "top_regions_by_growth": top_growth,
        "external_factor_correlation": {
            "economic_index": float(corr_econ) if pd.notna(corr_econ) else None,
            "cloud_market_demand": float(corr_market) if pd.notna(corr_market) else None,
            "holiday": float(corr_holiday) if pd.notna(corr_holiday) else None,
        },
        "monthly_avg_cpu": {int(k): float(v) for k,v in monthly.items()}
    }
    return jsonify(kpis)

@app.route("/api/cpu_usage")
def cpu_usage():
    df = _load_features()
    if df.empty:
        return jsonify([])
    res = df.groupby("date")["usage_cpu"].mean().reset_index()
    res["date"] = res["date"].dt.strftime("%Y-%m-%d")
    return jsonify(res.to_dict(orient="records"))

@app.route("/api/storage_usage")
def storage_usage():
    df = _load_features()
    if df.empty:
        return jsonify([])
    res = df.groupby("date")["usage_storage"].mean().reset_index()
    res["date"] = res["date"].dt.strftime("%Y-%m-%d")
    return jsonify(res.to_dict(orient="records"))

@app.route("/api/regions")
def regions():
    df = _load_features()
    if df.empty:
        # try raw
        azure = RAW / "azure_usage.csv"
        if azure.exists():
            df2 = pd.read_csv(azure)
            regions = sorted(df2["region"].unique().tolist())
            rtypes = sorted(df2["resource_type"].unique().tolist())
            return jsonify({"regions": regions, "resource_types": rtypes})
        return jsonify({"regions": [], "resource_types": []})
    regions = sorted(df["region"].unique().tolist())
    rtypes = sorted(df["resource_type"].unique().tolist())
    return jsonify({"regions": regions, "resource_types": rtypes})

@app.route("/api/recommendations")
def recommendations():
    days = int(request.args.get("days", 7))
    region = request.args.get("region")
    resource_type = request.args.get("resource_type")
    print(f"[API] /api/recommendations called with days={days}, region={region}, resource_type={resource_type}")
    recs = capacity_recommendations(days, region=region, resource_type=resource_type)
    print(f"[API] /api/recommendations returning {len(recs)} records")
    return jsonify(recs)

@app.route("/api/forecast")
def forecast():
    days = int(request.args.get("days", 30))
    region = request.args.get("region")
    resource_type = request.args.get("resource_type")
    print(f"[API] /api/forecast called with days={days}, region={region}, resource_type={resource_type}")
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from models.generate_forecast import generate_forecast
    forecast_data = generate_forecast(days, region=region, resource_type=resource_type)
    print(f"[API] /api/forecast returning {len(forecast_data)} records")
    return jsonify(forecast_data)

@app.route("/api/correlations")
def correlations():
    df = _load_features()
    if df.empty:
        return jsonify({"error": "No feature data available"}), 404

    # Apply filters if provided
    region = request.args.get("region")
    rtype = request.args.get("resource_type")
    if region:
        df = df[df["region"] == region]
    if rtype:
        df = df[df["resource_type"] == rtype]

    # Select key features for correlation analysis (only numeric ones)
    key_features = [
        'usage_cpu', 'usage_storage', 'users_active',
        'economic_index', 'cloud_market_demand', 'holiday',
        'usage_cpu_lag_1', 'usage_cpu_lag_3', 'usage_cpu_lag_7',
        'usage_cpu_roll_mean_7', 'usage_cpu_roll_mean_30',
        'cpu_utilization', 'storage_efficiency'
    ]

    # Filter to only include features that exist in the dataset
    available_features = [f for f in key_features if f in df.columns]

    # Also check for numeric columns that might exist in the dataset
    numeric_columns = df.select_dtypes(include=['number']).columns.tolist()
    additional_numeric = [col for col in numeric_columns if col not in available_features and col != 'date']

    # Combine the features
    all_features = available_features + additional_numeric

    if len(all_features) < 2:
        return jsonify({"error": "Insufficient numeric features for correlation analysis"}), 400

    # Calculate correlation matrix using only numeric features
    corr_matrix = df[all_features].corr()

    # Convert to the format expected by frontend
    correlations = {
        "features": all_features,
        "matrix": corr_matrix.values.tolist(),
        "target_correlations": {}
    }

    # Calculate correlations with the target variable (usage_cpu)
    if 'usage_cpu' in available_features:
        target_corr = corr_matrix['usage_cpu'].drop('usage_cpu')
        correlations["target_correlations"] = {
            feature: float(corr) for feature, corr in target_corr.items()
        }

    return jsonify(correlations)



# Optional home route message (avoid 404 confusion)
@app.route("/")
def home():
    return jsonify({"message":"Backend up. Use /api/... endpoints."})

if __name__ == "__main__":
    # Run dev server
    app.run(host="0.0.0.0", port=5000, debug=True)



