import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import joblib
import os

DATA_PATH = "backend/data/processed/feature_engineered.csv"
MODEL_PATH = "models/forecast_model.pkl"

def train_forecast_model():
    # Load processed feature-engineered dataset
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])

    # Aggregate daily CPU usage (for simplicity, single time series)
    daily_cpu = df.groupby("date")["usage_cpu"].mean().sort_index()

    # Train Holt-Winters model
    model = ExponentialSmoothing(
        daily_cpu, trend="add", seasonal="add", seasonal_periods=7
    ).fit()

    # Save trained model
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    print(f"[ForecastTrain] Model trained & saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_forecast_model()
