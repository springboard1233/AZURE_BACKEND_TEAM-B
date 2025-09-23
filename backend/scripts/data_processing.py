#!/usr/bin/env python3
"""
Data Processing Script for Azure Backend Team
Handles data loading, cleaning, merging, and basic EDA
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.utils import (
    load_csv, basic_cleaning, impute_missing,
    merge_datasets, save_df, add_time_features
)

def main():
    # Define paths
    data_dir = Path(__file__).parent.parent / "data"
    raw_dir = data_dir / "raw"
    processed_dir = data_dir / "processed"
    reports_dir = data_dir.parent / "reports"
    images_dir = reports_dir / "images"

    # Create directories if they don't exist
    processed_dir.mkdir(exist_ok=True)
    images_dir.mkdir(exist_ok=True)

    print("Loading datasets...")

    # Load datasets
    azure_df = load_csv(raw_dir / "azure_usage.csv")
    external_df = load_csv(raw_dir / "external_factors.csv")

    print(f"Azure data shape: {azure_df.shape}")
    print(f"External data shape: {external_df.shape}")

    # Basic cleaning
    print("Cleaning data...")
    azure_df = basic_cleaning(azure_df)
    external_df = basic_cleaning(external_df)

    # Handle missing values
    azure_df = impute_missing(azure_df)
    external_df = impute_missing(external_df)

    # Merge datasets
    print("Merging datasets...")
    # Note: external_factors doesn't have region column, so merge on date only
    merged_df = merge_datasets(azure_df, external_df, on=['date'])

    print(f"Merged data shape: {merged_df.shape}")

    # Add time features
    merged_df = add_time_features(merged_df)

    # Save cleaned merged dataset
    output_path = processed_dir / "cleaned_merged.csv"
    save_df(merged_df, output_path)
    print(f"Saved cleaned merged data to {output_path}")

    # Basic EDA
    print("Performing basic EDA...")

    # Summary statistics
    print("\n=== SUMMARY STATISTICS ===")
    print(merged_df.describe())

    # Average daily CPU usage per region
    print("\n=== AVERAGE DAILY CPU USAGE BY REGION ===")
    cpu_by_region = merged_df.groupby('region')['usage_cpu'].mean().sort_values(ascending=False)
    print(cpu_by_region)

    # Peak demand per month
    print("\n=== PEAK DEMAND PER MONTH ===")
    monthly_peak = merged_df.groupby(merged_df['date'].dt.to_period('M'))['usage_cpu'].max()
    print(monthly_peak)

    # Top 5 regions by usage
    print("\n=== TOP 5 REGIONS BY USAGE ===")
    top_regions = merged_df.groupby('region')['usage_cpu'].sum().nlargest(5)
    print(top_regions)

    # Create plots
    print("Creating plots...")

    # Set style
    plt.style.use('default')
    sns.set_palette("husl")

    # 1. CPU usage trends by region
    plt.figure(figsize=(12, 6))
    for region in merged_df['region'].unique():
        region_data = merged_df[merged_df['region'] == region]
        plt.plot(region_data['date'], region_data['usage_cpu'], label=region, alpha=0.7)

    plt.title('CPU Usage Trends by Region')
    plt.xlabel('Date')
    plt.ylabel('CPU Usage')
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(images_dir / 'cpu_usage_trends.png', dpi=300, bbox_inches='tight')
    plt.close()

    # 2. Storage consumption by region (bar chart)
    plt.figure(figsize=(10, 6))
    storage_by_region = merged_df.groupby('region')['usage_storage'].mean()
    storage_by_region.plot(kind='bar')
    plt.title('Average Storage Usage by Region')
    plt.xlabel('Region')
    plt.ylabel('Storage Usage')
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(images_dir / 'storage_usage_by_region.png', dpi=300, bbox_inches='tight')
    plt.close()

    # 3. Region-wise demand distribution (pie chart)
    plt.figure(figsize=(8, 8))
    demand_by_region = merged_df.groupby('region')['usage_cpu'].sum()
    plt.pie(demand_by_region.values, labels=demand_by_region.index, autopct='%1.1f%%')
    plt.title('CPU Demand Distribution by Region')
    plt.tight_layout()
    plt.savefig(images_dir / 'cpu_demand_pie.png', dpi=300, bbox_inches='tight')
    plt.close()

    # 4. Economic index vs CPU usage correlation
    plt.figure(figsize=(10, 6))
    plt.scatter(merged_df['economic_index'], merged_df['usage_cpu'], alpha=0.6)
    plt.title('Economic Index vs CPU Usage')
    plt.xlabel('Economic Index')
    plt.ylabel('CPU Usage')
    plt.tight_layout()
    plt.savefig(images_dir / 'economic_cpu_correlation.png', dpi=300, bbox_inches='tight')
    plt.close()

    print("Data processing completed successfully!")
    print(f"Processed data saved to: {output_path}")
    print(f"Plots saved to: {images_dir}")

if __name__ == "__main__":
    main()
