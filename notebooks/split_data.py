import pandas as pd
import os

file_name = 'milestone2_feature_engineered.csv'

# Check if file exists
if not os.path.exists(file_name):
    print(f"❌ ERROR: File {file_name} not found in the current directory.")
else:
    print(f"✅ File {file_name} found. Proceeding...")

    # Load feature-engineered dataset
    data = pd.read_csv(file_name)

    print(f"Original dataset shape: {data.shape}")
    print(f"Sample data:\n{data.head()}")

    # Convert 'date' column to datetime
    data['date'] = pd.to_datetime(data['date'], format='%Y-%m-%d')
    print("Date column converted successfully.")

    # Sort data by date
    data = data.sort_values(by='date')

    # Calculate sizes
    train_size = int(len(data) * 0.7)
    val_size = int(len(data) * 0.2)

    # Split dataset
    train_data = data[:train_size]
    val_data = data[train_size:train_size + val_size]
    test_data = data[train_size + val_size:]

    # Save the split datasets
    train_data.to_csv('train.csv', index=False)
    val_data.to_csv('val.csv', index=False)
    test_data.to_csv('test.csv', index=False)

    print(f"✅ Data split completed successfully!")
    print(f"Train data shape: {train_data.shape}")
    print(f"Validation data shape: {val_data.shape}")
    print(f"Test data shape: {test_data.shape}")
