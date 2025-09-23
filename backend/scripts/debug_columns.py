import pandas as pd

DATA_PATH = "backend/data/processed/feature_engineered.csv"

df = pd.read_csv(DATA_PATH)

print("✅ Columns in feature_engineered.csv:")
print(df.columns.tolist())
print("\n🔎 First 5 rows:")
print(df.head())
