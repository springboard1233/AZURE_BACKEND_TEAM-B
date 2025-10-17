import requests
import csv
from datetime import datetime

# Backend URL
BASE_URL = "http://127.0.0.1:8000/api"

# Define regions and services you want to forecast
REGIONS = ["East US", "West US","Southeast Asia","North Europe"]
SERVICES = ["Compute", "Storage","VM"]

# Mock features for forecasting (you can later make this dynamic)
FEATURES = {
    "usage_cpu": 50,
    "storage_allocated": 120,
    "users_active": 500
}

# CSV file to store forecast history
CSV_FILE = "forecast_history.csv"

# Create CSV file with headers if it doesn't exist
try:
    with open(CSV_FILE, mode='x', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp", "region", "service", "horizon",
            "forecast_demand", "available_capacity", "recommended_adjustment"
        ])
except FileExistsError:
    pass  # File already exists

def get_forecast(region, service, horizon=7):
    url = f"{BASE_URL}/forecast"
    data = {
        "region": region,
        "service": service,
        "horizon": horizon,
        "features": FEATURES
    }
    response = requests.post(url, json=data)
    response.raise_for_status()
    return response.json()

def get_capacity_planning(region, service, horizon=7):
    url = f"{BASE_URL}/capacity-planning"
    params = {
        "region": region,
        "service": service,
        "horizon": horizon
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

def save_to_csv(record):
    with open(CSV_FILE, mode='a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            record["timestamp"],
            record["region"],
            record["service"],
            record["horizon"],
            record["forecast_demand"],
            record["available_capacity"],
            record["recommended_adjustment"]
        ])

def run_automation():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    horizon = 7  # forecast horizon
    
    for region in REGIONS:
        for service in SERVICES:
            # Step 1: Get forecast
            forecast = get_forecast(region, service, horizon)
            
            # Step 2: Get capacity planning
            capacity = get_capacity_planning(region, service, horizon)
            
            # Step 3: Combine and save
            record = {
                "timestamp": timestamp,
                "region": region,
                "service": service,
                "horizon": horizon,
                "forecast_demand": capacity["forecast_demand"],
                "available_capacity": capacity["available_capacity"],
                "recommended_adjustment": capacity["recommended_adjustment"]
            }
            save_to_csv(record)
            print(f"Saved forecast for {region}-{service} at {timestamp}")

if __name__ == "__main__":
    run_automation()
