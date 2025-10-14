# backend/main.py - Enhanced with ML Forecasting Endpoints

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import csv
import pathlib
import pandas as pd
import numpy as np
import joblib
from xgboost import XGBRegressor
from datetime import datetime, timedelta

app = FastAPI(
    title="Azure Demand Forecasting API",
    description="ML-powered CPU usage forecasting with existing data endpoints",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent

# CSV Paths (Existing)
AZURE_CSV_PATH = BASE_DIR / "data" / "raw" / "azure_usage.csv"
EXTERNAL_CSV_PATH = BASE_DIR / "data" / "raw" / "external_factors.csv"
MERGED_CSV_PATH = BASE_DIR / "data" / "processed" / "cleaned_merged.csv"

# ML Model Paths (New)
MODEL_PATH = BASE_DIR / "models" / "xgboost_best.json"
ENCODER_PATH = BASE_DIR / "models" / "xgboost_encoders.pkl"
METRICS_PATH = BASE_DIR / "models" / "metrics_summary.csv"
FEATURE_DATA_PATH = BASE_DIR / "data" / "processed" / "feature_engineered.csv"

# Load ML Models (New)
print("📂 Loading ML models...")
try:
    model = XGBRegressor()
    model.load_model(str(MODEL_PATH))
    encoders = joblib.load(ENCODER_PATH)
    metrics_df = pd.read_csv(METRICS_PATH) if METRICS_PATH.exists() else None
    feature_data = pd.read_csv(FEATURE_DATA_PATH) if FEATURE_DATA_PATH.exists() else None
    print("✅ ML models loaded successfully!")
except Exception as e:
    print(f"⚠️  Warning: Could not load ML models: {e}")
    model = None
    encoders = None
    metrics_df = None
    feature_data = None


# ==================== EXISTING ENDPOINTS ====================

@app.get("/")
def root():
    return {
        "message": "FastAPI backend is running!",
        "version": "2.0.0",
        "features": {
            "data_endpoints": "✅ Active",
            "ml_forecasting": "✅ Active" if model else "❌ Not loaded"
        }
    }


@app.get("/api/overview-metrics")
def overview_metrics():
    """Get overview metrics from merged data"""
    total_records = 0
    total_cpu = 0
    total_storage = 0
    total_users = 0

    if not MERGED_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Merged CSV not found")

    try:
        with open(MERGED_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                total_records += 1
                total_cpu += float(row["usage_cpu"])
                total_storage += float(row["usage_storage"])
                total_users += int(row["users_active"])

        avg_cpu = round(total_cpu / total_records, 2) if total_records else 0
        avg_storage = round(total_storage / total_records, 2) if total_records else 0

        return {
            "total_records": total_records,
            "avg_cpu": avg_cpu,
            "avg_storage": avg_storage,
            "total_active_users": total_users
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics-data")
def analytics_data():
    """Get analytics data from raw folder"""
    data = []
    if not AZURE_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Azure usage CSV not found")

    try:
        with open(AZURE_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                data.append(row)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/raw/azure-usage")
def raw_azure_usage():
    """Get raw Azure usage data"""
    if not AZURE_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Azure usage CSV not found")

    try:
        with open(AZURE_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            return {"data": list(csv.DictReader(csvfile))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/raw/external-factors")
def raw_external_factors():
    """Get raw external factors data"""
    if not EXTERNAL_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="External factors CSV not found")

    try:
        with open(EXTERNAL_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            return {"data": list(csv.DictReader(csvfile))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/merged-data")
def merged_data():
    """Get merged data"""
    data = []
    if not MERGED_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Merged CSV not found")

    try:
        with open(MERGED_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                data.append(row)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/raw/merged-data")
def raw_merged_data():
    """Get raw merged dataset"""
    if not MERGED_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Merged CSV not found")

    try:
        with open(MERGED_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            return {"data": list(csv.DictReader(csvfile))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== NEW ML FORECASTING ENDPOINTS ====================

@app.get("/health")
def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": model is not None
    }


@app.get("/api/forecast/{region}/{service}")
async def get_forecast(
    region: str,
    service: str,
    days: int = Query(30, ge=7, le=90, description="Number of days to forecast")
):
    """
    Generate ML forecast for specific region and service
    
    Parameters:
    - region: East US, West US, North Europe, Southeast Asia
    - service: VM, Storage, Container
    - days: Number of days ahead (7-90)
    """
    if model is None or encoders is None:
        raise HTTPException(
            status_code=503,
            detail="ML models not loaded. Please train models first using: python scripts/model_training/train_all.py"
        )
    
    try:
        # Validate inputs
        valid_regions = ["East US", "West US", "North Europe", "Southeast Asia"]
        valid_services = ["VM", "Storage", "Container"]
        
        if region not in valid_regions:
            raise HTTPException(400, f"Invalid region. Must be one of: {valid_regions}")
        
        if service not in valid_services:
            raise HTTPException(400, f"Invalid service. Must be one of: {valid_services}")

        # Get last CPU value from historical data
        last_cpu = 75.0
        if feature_data is not None:
            series_data = feature_data[
                (feature_data['region'] == region) &
                (feature_data['resource_type'] == service)
            ]
            if len(series_data) > 0:
                last_cpu = float(series_data.iloc[-1]['usage_cpu'])

        # Generate forecast
        predictions = []
        current_date = datetime.now()
        
        for i in range(days):
            forecast_date = current_date + timedelta(days=i+1)
            
            # Prepare input features
            input_data = {
                "region": region,
                "resource_type": service,
                "usage_storage": 1500,
                "users_active": 350,
                "economic_index": 105.0,
                "cloud_market_demand": 1.0,
                "holiday": 1 if forecast_date.weekday() in [5, 6] else 0,
                "month": forecast_date.month,
                "day": forecast_date.day,
                "dayofweek": forecast_date.weekday(),
                "is_weekend": 1 if forecast_date.weekday() in [5, 6] else 0,
                "lag_1": last_cpu,
                "lag_7": last_cpu,
                "lag_30": last_cpu,
                "rolling_mean_7": last_cpu,
                "rolling_std_7": 5.0,
                "rolling_mean_30": last_cpu,
                "rolling_std_30": 8.0
            }
            
            df = pd.DataFrame([input_data])
            
            # Encode categorical features
            for col in ['region', 'resource_type']:
                if col in encoders:
                    df[col] = encoders[col].transform(df[col])
            
            # Make prediction
            pred = float(np.clip(model.predict(df)[0], 50, 99))
            
            # Calculate confidence interval (based on RMSE = 4.22)
            rmse = 4.22
            confidence_lower = max(50, pred - 1.96 * rmse)
            confidence_upper = min(99, pred + 1.96 * rmse)
            
            predictions.append({
                "date": forecast_date.strftime("%Y-%m-%d"),
                "prediction": round(pred, 2),
                "confidence_lower": round(confidence_lower, 2),
                "confidence_upper": round(confidence_upper, 2),
                "day_of_week": forecast_date.strftime("%A"),
                "is_weekend": forecast_date.weekday() in [5, 6],
                "week_number": forecast_date.isocalendar()[1]
            })
            
            # Update last_cpu for next iteration
            last_cpu = pred
        
        # Calculate statistics
        pred_values = [p['prediction'] for p in predictions]
        
        return {
            "success": True,
            "region": region,
            "service": service,
            "forecast_period": f"{days} days",
            "start_date": current_date.strftime("%Y-%m-%d"),
            "end_date": (current_date + timedelta(days=days)).strftime("%Y-%m-%d"),
            "predictions": predictions,
            "statistics": {
                "average": round(np.mean(pred_values), 2),
                "min": round(min(pred_values), 2),
                "max": round(max(pred_values), 2),
                "std": round(np.std(pred_values), 2),
                "trend": "increasing" if pred_values[-1] > pred_values[0] else "decreasing"
            },
            "model_info": {
                "name": "XGBoost",
                "r2_score": 0.8634,
                "rmse": 4.22,
                "mae": 3.19,
                "mape": 3.77
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=f"Forecast generation error: {str(e)}")


@app.get("/api/model-comparison")
async def get_model_comparison():
    """Get detailed comparison of all trained models"""
    if metrics_df is None:
        raise HTTPException(
            status_code=404,
            detail="Metrics file not found. Train models first using: python scripts/model_training/train_all.py"
        )
    
    try:
        models = []
        for _, row in metrics_df.iterrows():
            model_name = row['Model']
            models.append({
                "name": model_name,
                "mae": float(row['MAE']),
                "rmse": float(row['RMSE']),
                "r2_score": float(row['R²']),
                "mape": float(row['MAPE']),
                "training_time": "2-5 min" if model_name == 'XGBoost' else "5-10 min" if model_name == 'LSTM' else "1-2 min",
                "inference_speed": "< 10ms" if model_name == 'XGBoost' else "< 50ms" if model_name == 'LSTM' else "< 100ms",
                "complexity": "High" if model_name == 'LSTM' else "Medium" if model_name == 'XGBoost' else "Low",
                "best_for": "Real-time forecasting" if model_name == 'XGBoost' else "Deep pattern recognition" if model_name == 'LSTM' else "Simple forecasts",
                "status": "Production" if model_name == 'XGBoost' else "Experimental"
            })
        
        # Sort by R² score (best first)
        models.sort(key=lambda x: x['r2_score'], reverse=True)
        
        return {
            "success": True,
            "models": models,
            "recommendation": {
                "best_overall": models[0]['name'],
                "reason": f"Highest R² score ({models[0]['r2_score']:.4f}) with fast inference",
                "use_case": "Production deployment for real-time forecasting"
            }
        }
    except Exception as e:
        raise HTTPException(500, detail=f"Model comparison error: {str(e)}")


@app.get("/api/model-metrics")
async def get_model_metrics():
    """Get basic model performance metrics"""
    if metrics_df is None:
        raise HTTPException(
            status_code=404,
            detail="Metrics not found. Train models first."
        )
    
    try:
        metrics = metrics_df.to_dict(orient='records')
        best_model = metrics_df.loc[metrics_df['R²'].idxmax()].to_dict()
        
        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "metrics": metrics,
            "best_model": best_model,
            "comparison": {
                "best_r2": float(metrics_df['R²'].max()),
                "best_rmse": float(metrics_df['RMSE'].min()),
                "best_mae": float(metrics_df['MAE'].min())
            }
        }
    except Exception as e:
        raise HTTPException(500, detail=f"Metrics error: {str(e)}")


@app.get("/api/feature-importance")
async def get_feature_importance():
    """Get feature importance from the XGBoost model"""
    if model is None:
        raise HTTPException(503, "Model not loaded")
    
    try:
        feature_names = [
            'region', 'resource_type', 'usage_storage', 'users_active',
            'economic_index', 'cloud_market_demand', 'holiday', 'month',
            'day', 'dayofweek', 'is_weekend', 'lag_1', 'lag_7', 'lag_30',
            'rolling_mean_7', 'rolling_std_7', 'rolling_mean_30', 'rolling_std_30'
        ]
        
        importances = model.feature_importances_
        
        features = [
            {
                "feature": name,
                "importance": float(imp),
                "importance_percent": float(imp * 100)
            }
            for name, imp in zip(feature_names, importances)
        ]
        
        # Sort by importance
        features.sort(key=lambda x: x['importance'], reverse=True)
        
        return {
            "success": True,
            "features": features,
            "top_5": features[:5]
        }
    except Exception as e:
        raise HTTPException(500, detail=str(e))


# ==================== SERVER STARTUP ====================

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*80)
    print("🚀 AZURE DEMAND FORECASTING API v2.0")
    print("="*80)
    print(f"📊 ML Model Status: {'✅ Loaded' if model else '❌ Not loaded'}")
    print(f"🌐 Server: http://localhost:8000")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print("\n📋 Available Endpoints:")
    print("   Data APIs:")
    print("   - GET  /api/overview-metrics")
    print("   - GET  /api/analytics-data")
    print("   - GET  /api/raw/azure-usage")
    print("   - GET  /api/merged-data")
    print("\n   ML Forecasting APIs:")
    print("   - GET  /api/forecast/{region}/{service}")
    print("   - GET  /api/model-comparison")
    print("   - GET  /api/model-metrics")
    print("   - GET  /api/feature-importance")
    print("="*80 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
