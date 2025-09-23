# backend/scripts/train_model_cli.py

# backend/scripts/train_model_cli.py

import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from pathlib import Path

# ✅ Resolve paths relative to backend/
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "feature_engineered.csv"
MODEL_PATH = BASE_DIR / "models" / "forecast_model.pkl"


def train_model():
    print("[TrainModel] Loading data...")
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])

    # 🎯 Choose target column (update as per your forecasting goal)
    target_col = "usage_storage"   # or "usage_cpu" if you want CPU forecast
    y = df[target_col]

    # Drop non-numeric or irrelevant columns
    drop_cols = ["date", "region", "resource_type"]
    X = df.drop(columns=[target_col] + drop_cols, errors="ignore")

    print(f"[TrainModel] Features: {list(X.columns)}")
    print(f"[TrainModel] Target: {target_col}")

    # Train-test split (time-based, not random shuffle)
    split_index = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_index], X.iloc[split_index:]
    y_train, y_test = y.iloc[:split_index], y.iloc[split_index:]

    print("[TrainModel] Training model...")
    model = RandomForestRegressor(n_estimators=200, random_state=42)
    model.fit(X_train, y_train)

    score = model.score(X_test, y_test)
    print(f"[TrainModel] Model R^2 Score: {score:.4f}")

    # Save model
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"[TrainModel] Saved model → {MODEL_PATH}")

if __name__ == "__main__":
    train_model()
