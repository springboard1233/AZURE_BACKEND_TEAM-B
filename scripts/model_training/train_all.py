# scripts/model_training/train_all.py

import os
import pandas as pd
from pathlib import Path
from train_arima import train_arima_model
from train_xgboost import train_xgboost_model
from train_lstm import train_lstm_model


def verify_data(df):
    """Quick verification that lag features are correct"""
    print("\n" + "="*80)
    print("🔍 VERIFYING DATASET BEFORE TRAINING")
    print("="*80)
    
    # Check shape
    print(f"\n✓ Dataset shape: {df.shape}")
    print(f"✓ Expected rows: ~690 (if corrected)")
    
    if len(df) < 680 or len(df) > 700:
        print(f"⚠️  WARNING: Row count ({len(df)}) unexpected. Expected ~690.")
        print("   You might be using the old corrupted file!")
    
    # Check for NaN
    nan_count = df.isnull().sum().sum()
    if nan_count > 0:
        print(f"⚠️  WARNING: Found {nan_count} NaN values!")
    else:
        print("✓ No NaN values found")
    
    # Quick lag feature check
    if 'region' in df.columns and 'resource_type' in df.columns:
        df_sorted = df.copy()
        df_sorted['date'] = pd.to_datetime(df_sorted['date'])
        df_sorted = df_sorted.sort_values(['region', 'resource_type', 'date'])
        
        # Check West US Storage
        sample = df_sorted[
            (df_sorted['region'] == 'West US') & 
            (df_sorted['resource_type'] == 'Storage')
        ].head(5)
        
        if len(sample) >= 2:
            prev_cpu = sample.iloc[0]['usage_cpu']
            curr_lag1 = sample.iloc[1]['lag_1']
            
            if abs(prev_cpu - curr_lag1) < 0.01:
                print(f"✅ Lag features verification PASSED!")
                print(f"   (West US Storage lag_1 = {curr_lag1:.1f}, matches prev CPU = {prev_cpu:.1f})")
                return True
            else:
                print(f"❌ Lag features verification FAILED!")
                print(f"   West US Storage lag_1 = {curr_lag1:.1f}, but prev CPU = {prev_cpu:.1f}")
                print(f"   🚨 YOU ARE USING CORRUPTED DATA!")
                return False
    
    return True


def train_all_models():
    # Use Path for better cross-platform compatibility
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    DATA_PATH = PROJECT_ROOT / "data" / "processed" / "feature_engineered.csv"
    MODELS_DIR = "models"
    
    print("="*80)
    print("LOADING DATASET")
    print("="*80)
    print(f"\n📂 Loading from: {DATA_PATH}")
    
    # Check if file exists
    if not DATA_PATH.exists():
        print(f"❌ ERROR: File not found at {DATA_PATH}")
        print("Please ensure feature_engineered.csv exists in data/processed/")
        return
    
    df = pd.read_csv(DATA_PATH)
    print(f"✅ Dataset loaded: {df.shape}")
    
    # Verify data quality
    if not verify_data(df):
        print("\n" + "="*80)
        print("⚠️  DATA VERIFICATION FAILED!")
        print("="*80)
        print("""
The dataset appears to have corrupted lag features.
Please replace your current file with the corrected version.

To fix:
1. Use the corrected feature_engineered_CORRECTED.csv
2. Replace the file in data/processed/feature_engineered.csv
3. Run this script again
        """)
        response = input("\nDo you want to continue training anyway? (yes/no): ")
        if response.lower() != 'yes':
            print("Training cancelled.")
            return
    
    print("\n" + "="*80)
    print("STARTING MODEL TRAINING")
    print("="*80)

    # Train ARIMA
    print("\n" + "="*80)
    print("TRAINING ARIMA MODEL")
    print("="*80)
    arima_metrics = train_arima_model(df, MODELS_DIR)

    # Train XGBoost
    print("\n" + "="*80)
    print("TRAINING XGBOOST MODEL")
    print("="*80)
    xgb_metrics = train_xgboost_model(df, MODELS_DIR)

    # Train LSTM
    print("\n" + "="*80)
    print("TRAINING LSTM MODEL")
    print("="*80)
    lstm_metrics = train_lstm_model(df, MODELS_DIR)

    # Create metrics summary
    metrics_df = pd.DataFrame({
        "Model": ["ARIMA", "XGBoost", "LSTM"],
        "MAE": [arima_metrics[0], xgb_metrics[0], lstm_metrics[0]],
        "RMSE": [arima_metrics[1], xgb_metrics[1], lstm_metrics[1]],
        "R²": [arima_metrics[2], xgb_metrics[2], lstm_metrics[2]],
        "MAPE": [arima_metrics[3], xgb_metrics[3], lstm_metrics[3]]
    })

    # Save metrics
    os.makedirs(MODELS_DIR, exist_ok=True)
    summary_path = os.path.join(MODELS_DIR, "metrics_summary.csv")
    metrics_df.to_csv(summary_path, index=False)

    # Display results
    print("\n" + "="*80)
    print("✅ ALL MODELS TRAINED SUCCESSFULLY!")
    print("="*80)
    print(f"\n📊 Metrics saved at: {summary_path}")
    print("\n📊 Performance Summary:")
    print(metrics_df.to_string(index=False))
    
    # Performance evaluation
    print("\n" + "="*80)
    print("PERFORMANCE EVALUATION")
    print("="*80)
    
    best_r2 = metrics_df['R²'].max()
    best_model = metrics_df.loc[metrics_df['R²'].idxmax(), 'Model']
    
    print(f"\n🏆 Best performing model: {best_model} (R² = {best_r2:.4f})")
    
    if best_r2 > 0.80:
        print("\n✅✅✅ EXCELLENT PERFORMANCE! ✅✅✅")
        print("Your models are production-ready!")
    elif best_r2 > 0.60:
        print("\n✅ GOOD PERFORMANCE!")
        print("Models are working well with corrected data.")
    elif best_r2 > 0.30:
        print("\n⚠️  MODERATE PERFORMANCE")
        print("Consider hyperparameter tuning or feature engineering.")
    else:
        print("\n❌ POOR PERFORMANCE")
        print("Dataset might still have issues. Please verify data quality.")


if __name__ == "__main__":
    train_all_models()
