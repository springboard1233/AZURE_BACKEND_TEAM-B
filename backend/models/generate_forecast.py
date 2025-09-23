import pandas as pd
import joblib
from datetime import timedelta
from pathlib import Path

MODEL_PATH = "models/forecast_model.pkl"
DATA_PATH = Path("data/processed/feature_engineered.csv")

def generate_forecast(days=30, region=None, resource_type=None):
    # Load the dataset to apply filters
    if DATA_PATH.exists():
        df = pd.read_csv(DATA_PATH, parse_dates=["date"])

        # Apply filters to restrict to user's dataset values
        if region:
            df = df[df["region"] == region]
        if resource_type:
            df = df[df["resource_type"] == resource_type]

        # If no data after filtering, return empty list
        if df.empty:
            return []

        # Aggregate daily CPU usage for the filtered dataset
        daily_cpu = df.groupby("date")["usage_cpu"].mean().sort_index()

        # Retrain model on filtered data for more accurate forecasts
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        model = ExponentialSmoothing(
            daily_cpu, trend="add", seasonal="add", seasonal_periods=7
        ).fit()

        forecast = model.forecast(days)
        start_date = daily_cpu.index[-1] + timedelta(days=1)
    else:
        # Fallback to saved model if data file not found
        model = joblib.load(MODEL_PATH)
        forecast = model.forecast(days)
        start_date = model.fittedvalues.index[-1] + timedelta(days=1)

    dates = pd.date_range(start=start_date, periods=days, freq="D")

    return [{"date": str(d.date()), "predicted_cpu": float(v)} for d, v in zip(dates, forecast)]
