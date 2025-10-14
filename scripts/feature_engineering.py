# scripts/feature_engineering.py

import pandas as pd
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_selection import mutual_info_regression


def feature_engineering():
    # ----------------------------
    # 1. Determine project root
    # ----------------------------
    root = Path(__file__).resolve().parents[1]  # project root
    data_dir = root / "data" / "processed"
    reports_dir = root / "reports" / "figures"

    print("Project root:", root)
    print("Looking for CSV in:", data_dir)

    # Ensure directories exist
    data_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    # ----------------------------
    # 2. Load cleaned dataset
    # ----------------------------
    cleaned_path = data_dir / "cleaned_merged_REALISTIC.csv"

    if not cleaned_path.exists():
        print(f"Error: {cleaned_path} not found. Please run Milestone 1 first.")
        return

    df = pd.read_csv(cleaned_path)
    print("CSV loaded successfully!")
    print(f"Original shape: {df.shape}")

    # ----------------------------
    # 3. Preprocessing & Features
    # ----------------------------
    if "date" not in df.columns:
        print("Error: 'date' column not found in CSV.")
        return

    df["date"] = pd.to_datetime(df["date"])
    
    # ✅ CRITICAL FIX: Sort by region, resource_type, AND date for proper time series handling
    if "region" in df.columns and "resource_type" in df.columns:
        print("\n✅ Detected multi-series dataset (region + resource_type)")
        print("   Sorting by: region, resource_type, date")
        df = df.sort_values(["region", "resource_type", "date"]).reset_index(drop=True)
        has_grouping = True
    else:
        print("\n⚠️ No region/resource_type columns found - treating as single time series")
        df = df.sort_values("date").reset_index(drop=True)
        has_grouping = False

    # Time-based features
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["day"] = df["date"].dt.day
    df["dayofweek"] = df["date"].dt.dayofweek
    df["is_weekend"] = (df["dayofweek"] >= 5).astype(int)

    # ----------------------------
    # 4. LAG FEATURES (GROUPED) ✅ FIXED
    # ----------------------------
    target = "usage_cpu"
    if target not in df.columns:
        print(f"Error: target column '{target}' not found in CSV.")
        return

    print("\n✅ Creating lag features...")
    
    if has_grouping:
        # ✅ CORRECT: Group by region and resource_type before creating lags
        df["lag_1"] = df.groupby(["region", "resource_type"])[target].shift(1)
        df["lag_7"] = df.groupby(["region", "resource_type"])[target].shift(7)
        df["lag_30"] = df.groupby(["region", "resource_type"])[target].shift(30)
        print("   ✓ Lag features created with grouping by (region, resource_type)")
    else:
        # Single time series - no grouping needed
        df["lag_1"] = df[target].shift(1)
        df["lag_7"] = df[target].shift(7)
        df["lag_30"] = df[target].shift(30)
        print("   ✓ Lag features created for single time series")

    # ----------------------------
    # 5. ROLLING FEATURES (GROUPED) ✅ FIXED
    # ----------------------------
    print("\n✅ Creating rolling features...")
    
    if has_grouping:
        # ✅ CORRECT: Group by region and resource_type before creating rolling features
        def create_rolling_features(group):
            """Create rolling features within each group"""
            shifted = group[target].shift(1)
            group["rolling_mean_7"] = shifted.rolling(window=7, min_periods=1).mean()
            group["rolling_std_7"] = shifted.rolling(window=7, min_periods=1).std()
            group["rolling_mean_30"] = shifted.rolling(window=30, min_periods=1).mean()
            group["rolling_std_30"] = shifted.rolling(window=30, min_periods=1).std()
            return group
        
        df = df.groupby(["region", "resource_type"], group_keys=False).apply(create_rolling_features)
        print("   ✓ Rolling features created with grouping by (region, resource_type)")
    else:
        # Single time series - no grouping needed
        df["rolling_mean_7"] = df[target].shift(1).rolling(window=7, min_periods=1).mean()
        df["rolling_std_7"] = df[target].shift(1).rolling(window=7, min_periods=1).std()
        df["rolling_mean_30"] = df[target].shift(1).rolling(window=30, min_periods=1).mean()
        df["rolling_std_30"] = df[target].shift(1).rolling(window=30, min_periods=1).std()
        print("   ✓ Rolling features created for single time series")

    # ----------------------------
    # 6. EXTERNAL FEATURES (GROUPED IF APPLICABLE)
    # ----------------------------
    if "temperature" in df.columns:
        print("\n✅ Creating temperature features...")
        if has_grouping:
            df["temp_lag_1"] = df.groupby(["region", "resource_type"])["temperature"].shift(1)
            df["temp_rolling_7"] = (
                df.groupby(["region", "resource_type"])["temperature"]
                .shift(1)
                .rolling(window=7, min_periods=1)
                .mean()
                .reset_index(level=[0, 1], drop=True)
            )
        else:
            df["temp_lag_1"] = df["temperature"].shift(1)
            df["temp_rolling_7"] = df["temperature"].shift(1).rolling(window=7, min_periods=1).mean()

    if "demand_index" in df.columns:
        print("✅ Creating demand index change feature...")
        if has_grouping:
            df["demand_index_change"] = df.groupby(["region", "resource_type"])["demand_index"].pct_change()
        else:
            df["demand_index_change"] = df["demand_index"].pct_change()

    # ----------------------------
    # 7. HANDLE MISSING VALUES
    # ----------------------------
    print(f"\n✅ Checking for NaN values...")
    nan_counts = df.isnull().sum()
    print(f"   NaN counts before dropping:")
    print(nan_counts[nan_counts > 0])
    
    rows_before = len(df)
    
    # Option 1: Drop NaN (default - ensures clean data for all models)
    df_final = df.dropna().reset_index(drop=True)
    
    # Option 2: Keep NaN for XGBoost (uncomment to use)
    # df_final = df.reset_index(drop=True)
    # print("   ⚠️ Keeping NaN values - ensure you use XGBoost with missing=np.nan")
    
    rows_after = len(df_final)
    print(f"   Rows before: {rows_before}")
    print(f"   Rows after: {rows_after}")
    print(f"   Rows removed: {rows_before - rows_after}")

    # ----------------------------
    # 8. VERIFICATION OF CORRECTNESS ✅
    # ----------------------------
    print("\n" + "="*80)
    print("VERIFICATION: Checking lag feature correctness")
    print("="*80)
    
    if has_grouping and len(df_final) > 0:
        # Verify for a sample series
        sample_region = df_final["region"].iloc[0]
        sample_resource = df_final["resource_type"].iloc[0]
        
        sample_series = df_final[
            (df_final["region"] == sample_region) & 
            (df_final["resource_type"] == sample_resource)
        ].head(5)
        
        print(f"\nSample verification: {sample_region} - {sample_resource}")
        print(sample_series[["date", target, "lag_1", "lag_7"]].to_string(index=False))
        
        # Manual check
        if len(sample_series) >= 2:
            prev_cpu = sample_series.iloc[0][target]
            curr_lag1 = sample_series.iloc[1]["lag_1"]
            if abs(prev_cpu - curr_lag1) < 0.01:
                print(f"\n✅ VERIFICATION PASSED: lag_1 is correct ({curr_lag1} == {prev_cpu})")
            else:
                print(f"\n❌ VERIFICATION FAILED: lag_1 mismatch ({curr_lag1} != {prev_cpu})")

    # ----------------------------
    # 9. Save Feature Engineered Dataset
    # ----------------------------
    final_path = data_dir / "feature_engineered.csv"
    df_final.to_csv(final_path, index=False)
    print("\n" + "="*80)
    print("✅ Feature engineering complete!")
    print("="*80)
    print(f"✓ Feature-engineered dataset saved at {final_path}")
    print(f"✓ Final shape: {df_final.shape}")
    print(f"✓ Columns: {df_final.columns.tolist()}")

    # ----------------------------
    # 10. Metrics & Plots
    # ----------------------------
    numeric_df = df_final.select_dtypes(include=[np.number])

    # Correlation with target
    if target in numeric_df.columns:
        corr = numeric_df.corr()[target].sort_values(ascending=False)
        print("\n" + "="*80)
        print("Top 10 Features by Correlation with Target:")
        print("="*80)
        print(corr.head(11))  # Top 11 (includes target itself)

    # Feature importance
    X = df_final.drop(columns=[target, "date"], errors="ignore")
    y = df_final[target]

    # Ensure all features numeric
    X = pd.get_dummies(X, drop_first=True, dtype=float)
    X = X.apply(pd.to_numeric, errors="coerce").fillna(0.0)

    print("\n✅ Training Random Forest for feature importance...")
    rf = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X, y)
    importance = pd.Series(rf.feature_importances_, index=X.columns).sort_values(ascending=False)

    print("\n" + "="*80)
    print("Top 10 Features by Random Forest Importance:")
    print("="*80)
    print(importance.head(10))

    # Mutual information
    print("\n✅ Calculating mutual information...")
    mi = mutual_info_regression(X, y, random_state=42)
    mi_series = pd.Series(mi, index=X.columns).sort_values(ascending=False)
    
    print("\n" + "="*80)
    print("Top 10 Features by Mutual Information:")
    print("="*80)
    print(mi_series.head(10))

    # ----------------------------
    # 11. Save Plots
    # ----------------------------
    print("\n✅ Generating and saving plots...")
    
    # Feature importance plot
    plt.figure(figsize=(10, 6))
    sns.barplot(x=importance.head(10), y=importance.head(10).index, palette="viridis")
    plt.title("Top 10 Features by Random Forest Importance", fontsize=14, fontweight="bold")
    plt.xlabel("Importance Score", fontsize=12)
    plt.ylabel("Features", fontsize=12)
    plt.tight_layout()
    plt.savefig(reports_dir / "feature_importance.png", dpi=300)
    plt.close()
    print(f"   ✓ Saved: {reports_dir / 'feature_importance.png'}")

    # Correlation heatmap
    plt.figure(figsize=(12, 10))
    sns.heatmap(numeric_df.corr(), cmap="coolwarm", center=0, annot=False, fmt=".2f")
    plt.title("Feature Correlation Heatmap", fontsize=14, fontweight="bold")
    plt.tight_layout()
    plt.savefig(reports_dir / "correlation_heatmap.png", dpi=300)
    plt.close()
    print(f"   ✓ Saved: {reports_dir / 'correlation_heatmap.png'}")

    print("\n" + "="*80)
    print("✅ ALL FEATURE ENGINEERING COMPLETE!")
    print("="*80)
    print(f"\nOutput files:")
    print(f"  - Dataset: {final_path}")
    print(f"  - Plots: {reports_dir}")


if __name__ == "__main__":
    feature_engineering()
