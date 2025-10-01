# Azure Demand Forecasting

This project implements a demand forecasting system for Azure cloud services using machine learning techniques.

## Project Structure

- `data/` - Contains raw and processed data files
  - `raw/` - Raw data files including Azure usage and external factors
  - `processed/` - Cleaned and feature-engineered data
- `notebooks/` - Jupyter notebooks for exploratory data analysis and experimentation
- `scripts/` - Python scripts for data processing and feature engineering
- `reports/` - Generated reports and documentation
- `backend/` - FastAPI backend for serving the forecasting model
- `requirements.txt` - Python dependencies

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Run data loading and EDA: `python scripts/data_loading_eda.py`
2. Clean and merge data: `python scripts/data_cleaning_merging.py`
3. Perform feature engineering: `python scripts/feature_engineering.py`
4. Start the API server: `uvicorn backend.main:app --reload`
