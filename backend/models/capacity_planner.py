import pandas as pd
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DATA = BASE / "data"
PROC = DATA / "processed"
FEATURE_CSV = PROC / "feature_engineered.csv"

def capacity_recommendations(days=7, region=None, resource_type=None):
    """
    Generate capacity recommendations based on filtered dataset.
    """
    if FEATURE_CSV.exists():
        df = pd.read_csv(FEATURE_CSV, parse_dates=["date"])
    else:
        return []

    # Apply filters if provided
    if region:
        df = df[df["region"] == region]
    if resource_type:
        df = df[df["resource_type"] == resource_type]

    # Filter for the last 'days' days
    last_date = df["date"].max()
    start_date = last_date - pd.Timedelta(days=days)
    df_filtered = df[(df["date"] > start_date) & (df["date"] <= last_date)]

    recommendations = []
    for i, row in df_filtered.iterrows():
        rec = {
            "date": row["date"].strftime("%Y-%m-%d"),
            "predicted_cpu": row.get("predicted_cpu", None),
            "recommendation": "Scale up" if row.get("predicted_cpu", 0) > 70 else "Scale down"
        }
        recommendations.append(rec)

    return recommendations
