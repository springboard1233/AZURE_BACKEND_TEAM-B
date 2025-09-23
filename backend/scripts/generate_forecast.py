import pandas as pd
import joblib
from pathlib import Path

# Paths
MODEL_PATH = Path("models/forecast_model.pkl")
FORECAST_PATH = Path("data/processed/forecast.csv")

def generate_forecast(periods=30):
    print("[Forecast] Loading trained model...")
    model = joblib.load(MODEL_PATH)

    print(f"[Forecast] Generating next {periods} days forecast...")
    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)

    forecast.to_csv(FORECAST_PATH, index=False)
    print(f"[Forecast] Forecast saved at {FORECAST_PATH}")

    return forecast

if __name__ == "__main__":
    generate_forecast()
