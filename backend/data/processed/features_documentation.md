# Feature Engineering – Milestone 2

## Features added
- day_of_week, day_of_week_num, month, quarter, is_weekend
- usage_cpu_lag_{1,3,7}
- usage_cpu_roll_mean_{7,30}, usage_cpu_roll_max_{7,30}, usage_cpu_roll_min_{7,30}
- cpu_utilization (usage_cpu / max usage per resource)
- storage_efficiency (usage_storage / max storage per resource)
- merged external: economic_index, cloud_market_demand, holiday (by date)

## Features dropped
- None

## Justification
- Added temporal, lagged, and rolling context for seasonality & momentum.
- Ratios match evaluator formula from the Milestone-2 guide.
