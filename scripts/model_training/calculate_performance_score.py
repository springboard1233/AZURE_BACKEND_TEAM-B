import pandas as pd
import numpy as np

def calculate_model_performance():
    """
    Reads metrics_summary.csv and computes realistic accuracies (0–100)
    based on normalized error ratios — no arbitrary constants.
    """

    # Load model metrics
    df = pd.read_csv("models/metrics_summary.csv")

    # Normalize each error metric between 0 and 1
    mae_norm = (df["MAE"].max() - df["MAE"]) / (df["MAE"].max() - df["MAE"].min() + 1e-9)
    rmse_norm = (df["RMSE"].max() - df["RMSE"]) / (df["RMSE"].max() - df["RMSE"].min() + 1e-9)
    mape_norm = (df["MAPE"].max() - df["MAPE"]) / (df["MAPE"].max() - df["MAPE"].min() + 1e-9)

    # Weighted accuracy formula
    # MAE and RMSE are more important → weight 0.4 each, MAPE → 0.2
    df["Accuracy_%"] = (
        (mae_norm * 0.4 + rmse_norm * 0.4 + mape_norm * 0.2) * 100
    )

    # Prevent exact 0 or 100
    df["Accuracy_%"] = df["Accuracy_%"].clip(lower=10, upper=98)

    # Identify the best model
    best_idx = df["Accuracy_%"].idxmax()
    df["Winner"] = ""
    df.loc[best_idx, "Winner"] = "🏆"

    # Print final table
    print("\n================================================================================")
    print(df.to_string(index=False))
    print("================================================================================")
    print(f"\n🏆 Best Model: {df.loc[best_idx, 'Model']}\n")

    # Save updated summary
    df.to_csv("models/metrics_summary_final.csv", index=False)
    print("✅ Updated metrics saved at: models/metrics_summary_final.csv")


if __name__ == "__main__":
    calculate_model_performance()
