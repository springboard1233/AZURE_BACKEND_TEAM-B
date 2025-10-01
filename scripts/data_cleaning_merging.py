# data_cleaning_merging.py

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def clean_and_merge():
    # Load raw datasets
    azure_df = pd.read_csv("../data/raw/azure_usage.csv")
    external_df = pd.read_csv("../data/raw/external_factors.csv")

    print("Azure usage shape:", azure_df.shape)
    print("External factors shape:", external_df.shape)

    # Handle missing values (forward fill)
    azure_df = azure_df.ffill()
    external_df = external_df.ffill()

    # Convert date columns
    azure_df["date"] = pd.to_datetime(azure_df["date"])
    external_df["date"] = pd.to_datetime(external_df["date"])

    # Merge datasets on date
    merged_df = pd.merge(azure_df, external_df, on="date", how="left")

    print("Merged dataset shape:", merged_df.shape)
    print("Missing values after merge:\n", merged_df.isnull().sum())

    # Save processed dataset
    merged_df.to_csv("../data/processed/cleaned_merged.csv", index=False)
    print("✅ Cleaned dataset saved at ../data/processed/cleaned_merged.csv")

    # Quick correlation check on merged data
    numeric_df = merged_df.select_dtypes(include=["number"])
    if not numeric_df.empty:
        plt.figure(figsize=(10, 6))
        sns.heatmap(numeric_df.corr(), annot=True, cmap="coolwarm")
        plt.title("Correlation Heatmap - Cleaned & Merged Data")
        plt.show()
    else:
        print("⚠️ No numeric columns in merged dataset for correlation heatmap.")

if __name__ == "__main__":
    clean_and_merge()
