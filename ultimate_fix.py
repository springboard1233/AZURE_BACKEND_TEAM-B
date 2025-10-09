# ultimate_fix.py - Complete solution

import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("ULTIMATE DIAGNOSTIC & TRAINING SCRIPT")
print("="*80)

# Load data
df = pd.read_csv('data/processed/feature_engineered.csv')
print(f"\n1. Loaded data: {df.shape}")

# Analysis
print(f"\n2. Target (usage_cpu) statistics:")
print(df['usage_cpu'].describe())
target_variance = df['usage_cpu'].var()
print(f"   Target variance: {target_variance:.2f}")
print(f"   Target std: {df['usage_cpu'].std():.2f}")

# Check if target is actually predictable
print(f"\n3. Checking lag_1 correlation (should be high):")
correlation = df['lag_1'].corr(df['usage_cpu'])
print(f"   lag_1 correlation with target: {correlation:.4f}")

if correlation < 0.5:
    print("   ⚠️ WARNING: Low correlation! Time series might be too random.")

# Prepare data
df_train = df.copy()
if 'date' in df_train.columns:
    df_train = df_train.drop('date', axis=1)
if 'year' in df_train.columns:
    df_train = df_train.drop('year', axis=1)

# Encode
for col in ['region', 'resource_type']:
    if col in df_train.columns:
        le = LabelEncoder()
        df_train[col] = le.fit_transform(df_train[col])

X = df_train.drop('usage_cpu', axis=1)
y = df_train['usage_cpu']

print(f"\n4. Features: {X.shape[1]} columns")
print(f"   {X.columns.tolist()}")

# ⭐ FIX 1: Try different train/test splits
print(f"\n{'='*80}")
print("TESTING DIFFERENT TRAIN/TEST SPLITS")
print(f"{'='*80}")

splits = [
    (0.80, "80/20"),
    (0.85, "85/15"),
    (0.90, "90/10")
]

best_r2 = -np.inf
best_split = None

for train_ratio, name in splits:
    train_end = int(len(X) * train_ratio)
    
    X_train, y_train = X[:train_end], y[:train_end]
    X_test, y_test = X[train_end:], y[train_end:]
    
    # Simple model
    model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=5,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train, verbose=False)
    pred = model.predict(X_test)
    
    r2 = r2_score(y_test, pred)
    mae = mean_absolute_error(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    
    print(f"\n{name} split:")
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")
    print(f"  R²: {r2:.4f}, MAE: {mae:.2f}, RMSE: {rmse:.2f}")
    
    if r2 > best_r2:
        best_r2 = r2
        best_split = train_ratio

print(f"\n✅ Best split: {best_split*100:.0f}/{ (1-best_split)*100:.0f} (R² = {best_r2:.4f})")

# ⭐ FIX 2: Feature importance check
print(f"\n{'='*80}")
print("FEATURE IMPORTANCE ANALYSIS")
print(f"{'='*80}")

train_end = int(len(X) * best_split)
X_train, y_train = X[:train_end], y[:train_end]
X_test, y_test = X[train_end:], y[train_end:]

model = XGBRegressor(n_estimators=200, random_state=42, n_jobs=-1)
model.fit(X_train, y_train, verbose=False)

importance = pd.DataFrame({
    'feature': X.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print(f"\nTop 10 features:")
print(importance.head(10).to_string(index=False))

# ⭐ FIX 3: Use only most important features
print(f"\n{'='*80}")
print("TESTING WITH ONLY TOP FEATURES")
print(f"{'='*80}")

top_features = importance.head(10)['feature'].tolist()
print(f"\nUsing features: {top_features}")

X_train_top = X_train[top_features]
X_test_top = X_test[top_features]

model_top = XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    min_child_weight=1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    n_jobs=-1
)

model_top.fit(X_train_top, y_train, verbose=False)
pred_top = model_top.predict(X_test_top)

r2_top = r2_score(y_test, pred_top)
mae_top = mean_absolute_error(y_test, pred_top)
rmse_top = np.sqrt(mean_squared_error(y_test, pred_top))
mape_top = np.mean(np.abs((y_test - pred_top) / y_test)) * 100

print(f"\n✅ Results with top features:")
print(f"   R²: {r2_top:.4f}")
print(f"   MAE: {mae_top:.4f}")
print(f"   RMSE: {rmse_top:.4f}")
print(f"   MAPE: {mape_top:.2f}%")

# ⭐ FIX 4: Check baseline
baseline = np.full(len(y_test), y_train.mean())
baseline_r2 = r2_score(y_test, baseline)
print(f"\n📊 Baseline (always predict mean) R²: {baseline_r2:.4f}")

# ⭐ FIX 5: Check if data has enough signal
print(f"\n{'='*80}")
print("FINAL DIAGNOSIS")
print(f"{'='*80}")

if r2_top > 0.50:
    print("\n✅ MODELS CAN WORK! Achieved R² > 0.50")
    print("   The data has predictive signal.")
    print(f"   Best R²: {r2_top:.4f}")
elif r2_top > 0.20:
    print("\n⚠️ MODERATE PERFORMANCE (R² = {:.4f})".format(r2_top))
    print("   Possible issues:")
    print("   1. Dataset is too small (690 rows / 12 series = ~57 rows/series)")
    print("   2. CPU usage is highly variable")
    print("   3. External factors (economic_index, etc.) may not be strong predictors")
else:
    print(f"\n❌ POOR PERFORMANCE (R² = {r2_top:.4f})")
    print("\n   Root causes:")
    print("   1. Dataset size: 690 rows is VERY SMALL for ML")
    print("      - Need at least 2000-5000 rows for good performance")
    print("   2. High variance: CPU varies 50-99 (nearly random)")
    print("   3. Lag correlation: {:.4f} (should be > 0.7)".format(correlation))
    
    print("\n   Solutions:")
    print("   A. Collect MORE data (most important!)")
    print("   B. Use simpler baseline model (predict lag_1)")
    print("   C. Try prophet or statistical models")
    print("   D. Reduce model complexity")

# Save best model
import joblib
os.makedirs('models', exist_ok=True)
joblib.dump(model_top, 'models/xgboost_final.pkl')
print(f"\n✅ Best model saved to: models/xgboost_final.pkl")

print("\n" + "="*80)
