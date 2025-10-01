# data_loading_eda.py

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def load_and_explore():
    # Load raw datasets
    azure_usage = pd.read_csv("../data/raw/azure_usage.csv")
    external_factors = pd.read_csv("../data/raw/external_factors.csv")

    print("Azure usage data shape:", azure_usage.shape)
    print("External factors data shape:", external_factors.shape)

    print("\nAzure Usage Info:")
    print(azure_usage.info())
    print(azure_usage.head())
    print(azure_usage.describe())

    print("\nExternal Factors Info:")
    print(external_factors.info())
    print(external_factors.head())
    print(external_factors.describe())

    print("\nMissing values in Azure Usage:")
    print(azure_usage.isnull().sum())

    print("\nMissing values in External Factors:")
    print(external_factors.isnull().sum())

    # --- Visualization ---
    plt.figure(figsize=(12, 6))
    azure_usage.groupby("date")["usage_cpu"].sum().plot()
    plt.title("Total CPU Usage Over Time")
    plt.xlabel("Date")
    plt.ylabel("CPU Usage")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()

    plt.figure(figsize=(10, 5))
    azure_usage.groupby("region")["usage_cpu"].mean().plot(kind="bar", color="blue")
    plt.title("Region-wise Average CPU Usage")
    plt.xlabel("Region")
    plt.ylabel("Average CPU Usage")
    plt.tight_layout()
    plt.show()

    plt.figure(figsize=(8, 6))
    sns.heatmap(azure_usage.select_dtypes(include=[np.number]).corr(), annot=True, cmap="coolwarm")
    plt.title("Correlation Heatmap of Numeric Features")
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    load_and_explore()
