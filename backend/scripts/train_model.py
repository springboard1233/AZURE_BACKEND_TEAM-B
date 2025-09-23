import pandas as pd
import joblib
from prophet import Prophet
from pathlib import Path

# Paths
DATA_PATH = Path("data/processed/feature_engineered.csv")
MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

def train_forecast_model():
    print("[Train] Loading feature-engineered data...")
    df = pd.read_csv(DATA_PATH)

    # Prophet expects ds (date) & y (target)
    df = df.rename(columns={"date": "ds", "usage_cpu": "y"})  

    print("[Train] Training Prophet model...")
    model = Prophet()
    model.fit(df[["ds", "y"]])

    # Save model
    model_path = MODEL_DIR / "forecast_model.pkl"
    joblib.dump(model, model_path)

    print(f"[Train] Model saved at {model_path}")
    return model

if __name__ == "__main__":
    train_forecast_model()
