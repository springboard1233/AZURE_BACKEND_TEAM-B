# Azure Demand Forecasting System

## Overview
This project implements a comprehensive demand forecasting system for Azure cloud services using machine learning techniques. The system helps in predicting future resource utilization, enabling better capacity planning and cost optimization for Azure cloud infrastructure.

## Project Structure

### Data
- `data/raw/` - Contains raw data files including Azure usage metrics and external factors
- `data/processed/` - Cleaned and preprocessed datasets ready for modeling

### Backend
- `backend/` - FastAPI application serving the forecasting models
  - `main.py` - API endpoints and request handlers
  - `models/` - Trained model files and model loading logic
  - `utils/` - Utility functions and helpers

### Frontend
- `frontend/` - React-based dashboard
  - `public/` - Static assets
  - `src/` - Source code
    - `components/` - Reusable UI components
    - `pages/` - Application pages
    - `services/` - API service layer
    - `types/` - TypeScript type definitions

### Notebooks
- `notebooks/` - Jupyter notebooks for exploratory data analysis and model development

### Scripts
- `scripts/` - Data processing and model training scripts
  - `data_loading_eda.py` - Data loading and exploratory analysis
  - `data_cleaning_merging.py` - Data preprocessing pipeline
  - `feature_engineering.py` - Feature creation and transformation
  - `model_training/` - Model training and evaluation scripts

### Reports
- `reports/` - Generated reports and visualizations
  - `figures/` - Charts and plots

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- pip
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bivinbooster/AzureForge.git
   cd AzureForge
   ```

2. **Set up Python environment**
   ```bash
   # Create and activate virtual environment
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac

   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. **Set up frontend**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## Usage

### Running the Application

1. **Start the backend server**
   ```bash
   uvicorn backend.main:app --reload
   ```

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Data Flow

1. **Data Ingestion**: Collect raw Azure usage metrics and external factors
2. **Data Preprocessing**: Clean, transform, and prepare the data for modeling
3. **Feature Engineering**: Create relevant features for the forecasting models
4. **Model Training**: Train and evaluate multiple forecasting models
5. **Prediction**: Generate forecasts using the best performing model
6. **Visualization**: Display results through an interactive dashboard

## Models

The system implements the following models for demand forecasting:

1. **ARIMA (AutoRegressive Integrated Moving Average)**
   - Well-suited for time series forecasting
   - Handles trends and seasonality in the data

2. **LSTM (Long Short-Term Memory)**
   - Deep learning model for sequence prediction
   - Effective for capturing long-term dependencies in time series data

3. **XGBoost**
   - Gradient boosting model for regression tasks
   - Handles non-linear relationships well

## API Endpoints

### Forecast
- `GET /api/forecast` - Get forecast predictions
- `POST /api/train` - Trigger model training

### Performance
- `GET /api/performance` - Get model performance metrics
- `GET /api/features` - Get feature importance scores

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Azure ML](https://azure.microsoft.com/en-us/services/machine-learning/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://reactjs.org/)
- [XGBoost](https://xgboost.readthedocs.io/)
- [TensorFlow](https://www.tensorflow.org/)
