import pandas as pd

df = pd.read_csv("data/raw/external_factors.csv")
print(df.head())
print("Columns:", df.columns.tolist())
