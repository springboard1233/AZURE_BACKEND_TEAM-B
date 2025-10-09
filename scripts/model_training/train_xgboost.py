# scripts/model_training/train_xgboost.py

import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import os
from pathlib import Path


def train_xgboost_model(df, models_dir="models", target_col="usage_cpu"):
    """
    Train XGBoost model with optimized hyperparameters for time series forecasting.
    """
    
    # Remove date column
    if 'date' in df.columns:
        df = df.drop('date', axis=1)
    
    # Remove year if it's constant
    if 'year' in df.columns and df['year'].nunique() == 1:
        df = df.drop('year', axis=1)
    
    # Encode categorical features
    df_encoded = df.copy()
    label_encoders = {}
    
    for col in ['region', 'resource_type']:
        if col in df_encoded.columns:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col])
            label_encoders[col] = le
    
    # Separate features and target
    X = df_encoded.drop(target_col, axis=1)
    y = df_encoded[target_col]
    
    print(f"\n✅ Dataset prepared: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"   Features: {X.columns.tolist()}")
    
    # Time-based split (70% train, 20% validation, 10% test)
    n = len(X)
    train_end = int(n * 0.70)
    val_end = int(n * 0.90)
    
    X_train, y_train = X[:train_end], y[:train_end]
    X_val, y_val = X[train_end:val_end], y[train_end:val_end]
    X_test, y_test = X[val_end:], y[val_end:]
    
    print(f"\n✅ Split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
    
    # ✅ IMPROVED: Optimized XGBoost hyperparameters for time series
    model = XGBRegressor(
        n_estimators=2000,          # Many trees
        learning_rate=0.03,         # Small learning rate
        max_depth=5,                # Moderate depth to prevent overfitting
        min_child_weight=5,         # Require more samples per leaf
        subsample=0.7,              # Row subsampling
        colsample_bytree=0.7,       # Feature subsampling
        gamma=1.0,                  # Minimum loss reduction for split
        reg_alpha=1.0,              # L1 regularization
        reg_lambda=5.0,             # L2 regularization
        objective='reg:squarederror',
        random_state=42,
        n_jobs=-1,
        early_stopping_rounds=100,  # Stop if no improvement
        eval_metric='rmse'
    )
    
    print("\n✅ Training XGBoost with optimized hyperparameters...")
    
    # Train with early stopping
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_val, y_val)],
        verbose=50  # Print every 50 iterations
    )
    
    # Predict on test set
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    
    # Save model
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "xgboost_best.json")
    model.save_model(model_path)
    
    # Save label encoders
    encoder_path = os.path.join(models_dir, "xgboost_encoders.pkl")
    joblib.dump(label_encoders, encoder_path)
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n✅ XGBoost training complete.")
    print(f"Model saved at: {model_path}")
    print(f"Encoders saved at: {encoder_path}")
    print(f"\n📊 Test Metrics:")
    print(f"MAE: {mae:.4f} | RMSE: {rmse:.4f} | R²: {r2:.4f} | MAPE: {mape:.2f}%")
    print(f"\n📊 Top 5 Important Features:")
    print(feature_importance.head(5).to_string(index=False))
    
    return mae, rmse, r2, mape


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    DATA_PATH = PROJECT_ROOT / "data" / "processed" / "feature_engineered.csv"
    
    print(f"Loading data from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded shape: {df.shape}")
    
    metrics = train_xgboost_model(df)
    print("\nXGBoost metrics:", metrics)
