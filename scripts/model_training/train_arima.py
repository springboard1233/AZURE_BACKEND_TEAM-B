# scripts/model_training/train_arima.py

import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import os
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')


def train_arima_model(df, models_dir="models", target_col="usage_cpu"):
    """
    Improved ARIMA using SARIMAX with seasonal components.
    Trains separate models for each (region, resource_type) combination.
    """
    
    # Check if we have grouped data
    has_grouping = 'region' in df.columns and 'resource_type' in df.columns
    
    if not has_grouping:
        print("⚠️ No region/resource_type found. Training single ARIMA model.")
        return train_single_arima(df, models_dir, target_col)
    
    # Train separate model for each series
    print(f"\n✅ Training separate ARIMA models for each time series...")
    
    all_predictions = []
    all_actuals = []
    models = {}
    
    for (region, resource), group in df.groupby(['region', 'resource_type']):
        print(f"\n📊 Training: {region} - {resource}")
        
        target = group[target_col].values
        n = len(target)
        
        # 70-20-10 split
        train_end = int(n * 0.70)
        val_end = int(n * 0.90)
        
        train_data = target[:train_end]
        val_data = target[train_end:val_end]
        test_data = target[val_end:]
        
        # Try different SARIMAX configurations
        best_aic = np.inf
        best_order = None
        best_model = None
        
        # Grid search for best parameters
        for p in range(0, 3):
            for d in range(0, 2):
                for q in range(0, 3):
                    try:
                        model = SARIMAX(train_data, order=(p, d, q), seasonal_order=(1, 0, 1, 7))
                        fitted = model.fit(disp=False, maxiter=200)
                        
                        if fitted.aic < best_aic:
                            best_aic = fitted.aic
                            best_order = (p, d, q)
                            best_model = fitted
                    except:
                        continue
        
        if best_model is None:
            print(f"   ⚠️ Could not fit model for {region} - {resource}")
            continue
        
        # Retrain on train + val
        combined_train = np.concatenate([train_data, val_data])
        final_model = SARIMAX(combined_train, order=best_order, seasonal_order=(1, 0, 1, 7)).fit(disp=False)
        
        # Predict test
        preds = final_model.forecast(len(test_data))
        
        all_predictions.extend(preds)
        all_actuals.extend(test_data)
        
        models[f"{region}_{resource}"] = {
            'model': final_model,
            'order': best_order
        }
        
        print(f"   ✓ Best order: {best_order}, AIC: {best_aic:.2f}")
    
    # Overall metrics
    all_predictions = np.array(all_predictions)
    all_actuals = np.array(all_actuals)
    
    mae = mean_absolute_error(all_actuals, all_predictions)
    rmse = np.sqrt(mean_squared_error(all_actuals, all_predictions))
    r2 = r2_score(all_actuals, all_predictions)
    mape = np.mean(np.abs((all_actuals - all_predictions) / all_actuals)) * 100
    
    # Save models
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "arima_models.pkl")
    joblib.dump(models, model_path)
    
    print(f"\n✅ ARIMA training complete for {len(models)} series")
    print(f"Models saved at: {model_path}")
    print(f"\n📊 Overall Test Metrics:")
    print(f"MAE: {mae:.4f} | RMSE: {rmse:.4f} | R²: {r2:.4f} | MAPE: {mape:.2f}%")
    
    return mae, rmse, r2, mape


def train_single_arima(df, models_dir, target_col):
    """Fallback for single time series"""
    target = df[target_col].values
    n = len(target)
    train_end = int(n * 0.70)
    val_end = int(n * 0.90)
    
    train_data = target[:train_end]
    val_data = target[train_end:val_end]
    test_data = target[val_end:]
    
    # Grid search
    best_aic = np.inf
    best_order = None
    
    for p in range(0, 4):
        for d in range(0, 2):
            for q in range(0, 4):
                try:
                    model = SARIMAX(train_data, order=(p, d, q), seasonal_order=(1, 0, 1, 7))
                    fitted = model.fit(disp=False)
                    if fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_order = (p, d, q)
                except:
                    continue
    
    combined_train = np.concatenate([train_data, val_data])
    final_model = SARIMAX(combined_train, order=best_order, seasonal_order=(1, 0, 1, 7)).fit(disp=False)
    
    preds = final_model.forecast(len(test_data))
    
    mae = mean_absolute_error(test_data, preds)
    rmse = np.sqrt(mean_squared_error(test_data, preds))
    r2 = r2_score(test_data, preds)
    mape = np.mean(np.abs((test_data - preds) / test_data)) * 100
    
    os.makedirs(models_dir, exist_ok=True)
    joblib.dump(final_model, os.path.join(models_dir, "arima_single.pkl"))
    
    print(f"\n✅ ARIMA: Best order {best_order}")
    print(f"MAE: {mae:.4f} | RMSE: {rmse:.4f} | R²: {r2:.4f} | MAPE: {mape:.2f}%")
    
    return mae, rmse, r2, mape


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    DATA_PATH = PROJECT_ROOT / "data" / "processed" / "feature_engineered.csv"
    
    print(f"Loading data from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded shape: {df.shape}")
    
    metrics = train_arima_model(df)
    print("\nARIMA metrics:", metrics)
