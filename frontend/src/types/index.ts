// frontend/src/types/index.ts

export interface ForecastPrediction {
  date: string;
  prediction: number;
  confidence_lower: number;
  confidence_upper: number;
  day_of_week: string;
  is_weekend: boolean;
  week_number: number;
}

export interface ForecastResponse {
  success: boolean;
  region: string;
  service: string;
  forecast_period: string;
  start_date: string;
  end_date: string;
  predictions: ForecastPrediction[];
  statistics: {
    average: number;
    min: number;
    max: number;
    std: number;
    trend: string;
  };
  model_info: {
    name: string;
    r2_score: number;
    rmse: number;
    mae: number;
    mape: number;
  };
}

export interface ModelMetrics {
  name: string;
  mae: number;
  rmse: number;
  r2_score: number;
  mape: number;
  training_time: string;
  inference_speed: string;
  complexity: string;
  best_for: string;
  status: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  importance_percent: number;
  category: string;
}
