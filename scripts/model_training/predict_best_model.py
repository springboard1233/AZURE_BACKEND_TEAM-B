# scripts/model_training/predict_best_model.py
import os
import pandas as pd
import numpy as np
import joblib
from tensorflow.keras.models import load_model
from xgboost import Booster, DMatrix
from statsmodels.tsa.arima.model import ARIMAResults

# Ensure reproducibility for TensorFlow
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

# Paths and constants
MODELS_DIR = "models"
DATA_PATH = "data/processed/feature_engineered.csv"
TARGET_COL = "usage_cpu"
SEQ_LENGTH = 10  # for LSTM

# --- Load new/test data ---
df = pd.read_csv(DATA_PATH)

# --- Load metrics with realistic Accuracy_% ---
metrics_path = os.path.join(MODELS_DIR, "metrics_summary_final.csv")
if not os.path.exists(metrics_path):
    raise FileNotFoundError(f"❌ metrics_summary_final.csv not found at {metrics_path}")

metrics_df = pd.read_csv(metrics_path)

# --- Select best model based on realistic Accuracy_% ---
best_model_name = metrics_df.loc[metrics_df["Accuracy_%"].idxmax(), "Model"]
best_accuracy = metrics_df.loc[metrics_df["Accuracy_%"].idxmax(), "Accuracy_%"]
print(f"🏆 Best model selected based on realistic Accuracy_% ({best_accuracy:.2f}%): {best_model_name}")

# --- Prepare features ---
df_encoded = pd.get_dummies(df, columns=["region", "resource_type"], drop_first=True)
features = df_encoded.drop(columns=[TARGET_COL, "date"], errors="ignore")

# --- Step 1: Make predictions using the best model ---
if best_model_name == "ARIMA":
    model_path = os.path.join(MODELS_DIR, "arima_best.pkl")
    model = joblib.load(model_path)
    y = df[TARGET_COL]
    forecast = model.forecast(steps=len(y))
    df["predicted_usage_cpu"] = forecast

elif best_model_name == "XGBoost":
    model_path = os.path.join(MODELS_DIR, "xgboost_best.json")
    scaler_path = os.path.join(MODELS_DIR, "xgboost_scaler.pkl")
    model = Booster()
    model.load_model(model_path)
    scaler = joblib.load(scaler_path)
    X_scaled = scaler.transform(features)
    dtest = DMatrix(X_scaled)
    df["predicted_usage_cpu"] = model.predict(dtest)

elif best_model_name == "LSTM":
    model_path = os.path.join(MODELS_DIR, "lstm_best.h5")
    scaler_path = os.path.join(MODELS_DIR, "lstm_scaler.pkl")
    model = load_model(model_path)
    scaler = joblib.load(scaler_path)

    target_series = df[[TARGET_COL]].values
    target_scaled = scaler.transform(target_series)

    X_seq = []
    for i in range(len(target_scaled) - SEQ_LENGTH):
        X_seq.append(target_scaled[i:i + SEQ_LENGTH])
    X_seq = np.array(X_seq)

    preds_scaled = model.predict(X_seq)
    preds = scaler.inverse_transform(preds_scaled)

    # Align predictions with original dataframe
    df = df.iloc[SEQ_LENGTH:].copy()
    df["predicted_usage_cpu"] = preds.flatten()

else:
    raise ValueError(f"Unknown model type: {best_model_name}")

# --- Step 2: Save predictions ---
output_path = os.path.join(MODELS_DIR, "predictions.csv")
df.to_csv(output_path, index=False)
print(f"\n✅ Predictions saved at: {output_path}")
