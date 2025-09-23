import pandas as pd
from pathlib import Path

FORECAST_PATH = Path("data/processed/forecast.csv")
RECOMMEND_PATH = Path("data/processed/recommendations.csv")

def recommend_capacity(threshold=80):
    print("[Recommend] Loading forecast data...")
    df = pd.read_csv(FORECAST_PATH)

    # Simple logic: if forecasted usage > threshold → recommend scale up
    df["recommendation"] = df["yhat"].apply(
        lambda x: "Scale Up" if x > threshold else "Maintain"
    )

    df.to_csv(RECOMMEND_PATH, index=False)
    print(f"[Recommend] Recommendations saved at {RECOMMEND_PATH}")

    return df

if __name__ == "__main__":
    recommend_capacity()
