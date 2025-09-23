import pandas as pd
import matplotlib.pyplot as plt

# -------------------------------
# Load your events dataset
# -------------------------------
events = pd.read_csv("events.csv", parse_dates=["timestamp"])

# Ensure timestamp is datetime
events["timestamp"] = pd.to_datetime(events["timestamp"])

# -------------------------------
# User Engagement Metrics
# -------------------------------
# Daily Active Users (DAU)
dau = events.groupby(events["timestamp"].dt.date)["user_id"].nunique()

# Total Events per Day
events_per_day = events.groupby(events["timestamp"].dt.date).size()

# Average Events per User (per day)
avg_events_per_user = events_per_day / dau

engagement_metrics = pd.DataFrame({
    "DAU": dau,
    "Total Events": events_per_day,
    "Avg Events/User": avg_events_per_user
})

# Save to CSV
engagement_metrics.to_csv("user_engagement_metrics.csv")
print("✅ User Engagement Metrics saved to user_engagement_metrics.csv")

# -------------------------------
# Active User Distribution
# -------------------------------
# Count number of events per user
user_activity = events.groupby("user_id").size()

# Save distribution
user_activity.to_csv("active_user_distribution.csv", header=["event_count"])
print("✅ Active User Distribution saved to active_user_distribution.csv")

# Plot distribution (optional)
plt.figure(figsize=(8,5))
user_activity.hist(bins=30)
plt.title("Active User Distribution")
plt.xlabel("Number of Events per User")
plt.ylabel("Number of Users")
plt.tight_layout()
plt.savefig("active_user_distribution.png", dpi=150)
plt.close()
print("📊 Active User Distribution chart saved as active_user_distribution.png")
