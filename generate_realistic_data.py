# generate_realistic_data.py - Create predictable time series

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

# Parameters
start_date = datetime(2023, 1, 1)
end_date = datetime(2023, 3, 31)
regions = ['East US', 'West US', 'North Europe', 'Southeast Asia']
resource_types = ['VM', 'Storage', 'Container']

data = []

for region in regions:
    for resource_type in resource_types:
        # Initialize with random baseline
        baseline_cpu = np.random.uniform(60, 80)
        
        current_date = start_date
        while current_date <= end_date:
            # ⭐ KEY: ADD TEMPORAL DEPENDENCIES
            
            # 1. Daily trend (slight drift)
            baseline_cpu += np.random.normal(0, 0.5)
            
            # 2. Weekly seasonality
            day_of_week = current_date.weekday()
            if day_of_week in [5, 6]:  # Weekend
                weekly_factor = -5  # Lower usage on weekends
            else:
                weekly_factor = 5   # Higher usage on weekdays
            
            # 3. Time-of-day pattern (simulated)
            hour_factor = np.sin(current_date.day / 7 * np.pi) * 10
            
            # 4. Random noise
            noise = np.random.normal(0, 5)
            
            # ⭐ COMBINE: Previous value + patterns + noise
            usage_cpu = baseline_cpu + weekly_factor + hour_factor + noise
            
            # Clip to realistic range
            usage_cpu = np.clip(usage_cpu, 50, 99)
            
            # Update baseline for next iteration (creates autocorrelation!)
            baseline_cpu = usage_cpu
            
            # Other features (can also add patterns)
            usage_storage = np.random.randint(600, 2000)
            users_active = np.random.randint(200, 500)
            economic_index = np.random.uniform(95, 115)
            cloud_market_demand = np.random.uniform(0.8, 1.2)
            holiday = 1 if current_date.weekday() in [5, 6] else 0
            
            data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'region': region,
                'resource_type': resource_type,
                'usage_cpu': int(usage_cpu),
                'usage_storage': usage_storage,
                'users_active': users_active,
                'economic_index': round(economic_index, 2),
                'cloud_market_demand': round(cloud_market_demand, 2),
                'holiday': holiday
            })
            
            current_date += timedelta(days=1)

# Create DataFrame
df = pd.DataFrame(data)

# Save
df.to_csv('data/processed/cleaned_merged_REALISTIC.csv', index=False)

print("="*80)
print("✅ REALISTIC DATA GENERATED!")
print("="*80)
print(f"\nShape: {df.shape}")

# Verify temporal patterns
print("\n🔍 Verification:")
for (region, resource), group in df.groupby(['region', 'resource_type']):
    cpu_values = group['usage_cpu'].values
    lag1_corr = np.corrcoef(cpu_values[:-1], cpu_values[1:])[0, 1]
    
    if lag1_corr > 0.7:
        status = "✅ EXCELLENT"
    elif lag1_corr > 0.5:
        status = "✅ GOOD"
    else:
        status = "⚠️ Still random"
    
    print(f"  {region:20s} - {resource:10s}: lag-1 corr = {lag1_corr:.4f} {status}")

print("\n" + "="*80)
print("Now run feature engineering with this new data!")
print("Expected model performance: R² > 0.70")
print("="*80)
