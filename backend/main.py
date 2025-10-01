from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import csv, pathlib

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent

# CSV Paths
AZURE_CSV_PATH = BASE_DIR / "data" / "raw" / "azure_usage.csv"
EXTERNAL_CSV_PATH = BASE_DIR / "data" / "raw" / "external_factors.csv"
MERGED_CSV_PATH = BASE_DIR / "data" / "processed" / "cleaned_merged.csv"

@app.get("/")
def root():
    return {"message": "FastAPI backend is running!"}

# --- Overview Metrics ---
@app.get("/api/overview-metrics")
def overview_metrics():
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

# --- Analytics Data (from raw folder) ---
@app.get("/api/analytics-data")
def analytics_data():
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

# --- Raw Azure Usage Data ---
@app.get("/api/raw/azure-usage")
def raw_azure_usage():
    if not AZURE_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Azure usage CSV not found")

    try:
        with open(AZURE_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            return {"data": list(csv.DictReader(csvfile))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Raw External Factors Data ---
@app.get("/api/raw/external-factors")
def raw_external_factors():
    if not EXTERNAL_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="External factors CSV not found")

    try:
        with open(EXTERNAL_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            return {"data": list(csv.DictReader(csvfile))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Merged Data ---
@app.get("/api/merged-data")
def merged_data():
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


# --- Raw Merged Dataset ---
@app.get("/api/raw/merged-data")
def raw_merged_data():
    if not MERGED_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Merged CSV not found")

    try:
        with open(MERGED_CSV_PATH, newline="", encoding="utf-8") as csvfile:
            return {"data": list(csv.DictReader(csvfile))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
