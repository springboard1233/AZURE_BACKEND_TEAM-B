# app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Simple Forecast API")

# Allow CORS for testing in Swagger or frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Data Models
# -----------------------------
class ForecastRequest(BaseModel):
    region: str
    service: str
    horizon: int
    features: Dict[str, float]

class ForecastResponse(BaseModel):
    region: str
    service: str
    horizon: int
    forecast_demand: float

class CapacityResponse(BaseModel):
    region: str
    service: str
    forecast_demand: float
    available_capacity: float
    recommended_adjustment: str

class MonitoringResponse(BaseModel):
    current_accuracy_pct: float
    mean_absolute_error: float
    drift_pct: float
    retrain_required: bool

# -----------------------------
# In-memory storage (for simplicity)
# -----------------------------
forecasts = {}  # key = region+service, value = forecast_demand

# -----------------------------
# API Endpoints
# -----------------------------
@app.post("/api/forecast", response_model=ForecastResponse)
def forecast(data: ForecastRequest):
    # Simple mock forecast: sum of feature values
    forecast_value = sum(data.features.values()) / 10  # simple mock logic
    forecasts[f"{data.region}_{data.service}"] = forecast_value
    return ForecastResponse(
        region=data.region,
        service=data.service,
        horizon=data.horizon,
        forecast_demand=forecast_value
    )

@app.get("/api/capacity-planning", response_model=CapacityResponse)
def capacity_planning(region: str, service: str, horizon: int = 7):
    key = f"{region}_{service}"
    if key not in forecasts:
        raise HTTPException(status_code=400, detail="No forecast found for this region/service")
    
    forecast_value = forecasts[key]
    available_capacity = forecast_value * 1.1  # simple mock
    adjustment = available_capacity - forecast_value
    return CapacityResponse(
        region=region,
        service=service,
        forecast_demand=forecast_value,
        available_capacity=available_capacity,
        recommended_adjustment=f"Increase capacity by {adjustment:.1f}"
    )

@app.post("/api/record_actual")
def record_actual(region: str, service: str, horizon: int, actual_value: float):
    key = f"{region}_{service}"
    if key not in forecasts:
        raise HTTPException(status_code=400, detail="No forecast found to update")
    # overwrite forecast with actual (simple mock)
    forecasts[key] = actual_value
    return {"status": "actual recorded"}

@app.get("/api/monitoring", response_model=MonitoringResponse)
def monitoring():
    # simple mock metrics
    return MonitoringResponse(
        current_accuracy_pct=95,
        mean_absolute_error=5,
        drift_pct=2,
        retrain_required=False
    )

@app.post("/api/retrain")
def retrain():
    # simple mock retrain
    return {"status": "retrain started"}

from fastapi.responses import FileResponse

@app.get("/api/forecast_history")
def get_forecast_history():
    return FileResponse("forecast_history.csv", media_type="text/csv", filename="forecast_history.csv")

# -----------------------------
# Run with: uvicorn app:app --reload
# -----------------------------





# ---------------- Dockerfile (for reference) ----------------
# FROM python:3.11-slim
# WORKDIR /app
# COPY . /app
# RUN pip install --no-cache-dir -r requirements.txt
# EXPOSE 8000
# CMD ["uvicorn", "milestone4_backend:app", "--host", "0.0.0.0", "--port", "8000"]

# ---------------- requirements.txt ----------------
# fastapi
# uvicorn[standard]
# joblib
# scikit-learn
# pandas
# sqlalchemy
# apscheduler
# numpy
# pydantic
