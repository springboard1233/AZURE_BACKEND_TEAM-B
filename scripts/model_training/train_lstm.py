# scripts/model_training/train_lstm.py

import os
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
import joblib
from pathlib import Path


def train_lstm_model(df, models_dir="models", target_col="usage_cpu", seq_length=7):
    """
    Improved LSTM model with better architecture and hyperparameters.
    Uses sequence length of 7 (one week) for better temporal patterns.
    """
    
    # Remove date column
    if 'date' in df.columns:
        df = df.drop('date', axis=1)
    
    # Encode categorical features
    df_encoded = df.copy()
    label_encoders = {}
    
    for col in ['region', 'resource_type']:
        if col in df_encoded.columns:
            le = LabelEncoder()
            df_encoded[col] = le.fit_transform(df_encoded[col])
            label_encoders[col] = le
    
    # Prepare features and target
    X = df_encoded.drop(target_col, axis=1).values
    y = df_encoded[target_col].values.reshape(-1, 1)
    
    # Scale ALL features (not just target)
    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()
    
    X_scaled = scaler_X.fit_transform(X)
    y_scaled = scaler_y.fit_transform(y)
    
    # Split data (70% train, 20% val, 10% test)
    n = len(X_scaled)
    train_end = int(n * 0.70)
    val_end = int(n * 0.90)
    
    X_train = X_scaled[:train_end]
    X_val = X_scaled[train_end:val_end]
    X_test = X_scaled[val_end:]
    
    y_train = y_scaled[:train_end]
    y_val = y_scaled[train_end:val_end]
    y_test = y_scaled[val_end:]
    
    # Create sequences
    def create_sequences(X, y, seq_length):
        Xs, ys = [], []
        for i in range(len(X) - seq_length):
            Xs.append(X[i:i + seq_length])
            ys.append(y[i + seq_length])
        return np.array(Xs), np.array(ys)
    
    X_train_seq, y_train_seq = create_sequences(X_train, y_train, seq_length)
    X_val_seq, y_val_seq = create_sequences(X_val, y_val, seq_length)
    X_test_seq, y_test_seq = create_sequences(X_test, y_test, seq_length)
    
    print(f"\n✅ LSTM sequences created:")
    print(f"   Train: {X_train_seq.shape}, Val: {X_val_seq.shape}, Test: {X_test_seq.shape}")
    
    # ✅ IMPROVED: Better LSTM architecture
    model = Sequential([
        LSTM(100, activation='relu', return_sequences=True, input_shape=(seq_length, X.shape[1])),
        Dropout(0.2),
        LSTM(50, activation='relu'),
        Dropout(0.2),
        Dense(25, activation='relu'),
        Dense(1)
    ])
    
    # Use Adam optimizer with custom learning rate
    optimizer = Adam(learning_rate=0.001)
    model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
    
    # Callbacks
    os.makedirs(models_dir, exist_ok=True)
    best_model_path = os.path.join(models_dir, "lstm_best.keras")
    
    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=15,
        restore_best_weights=True,
        verbose=1
    )
    
    checkpoint = ModelCheckpoint(
        best_model_path,
        monitor='val_loss',
        save_best_only=True,
        mode='min',
        verbose=1
    )
    
    reduce_lr = ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=5,
        min_lr=0.00001,
        verbose=1
    )
    
    print("\n✅ Training LSTM model...")
    
    # Train
    history = model.fit(
        X_train_seq, y_train_seq,
        validation_data=(X_val_seq, y_val_seq),
        epochs=100,
        batch_size=32,
        verbose=1,
        callbacks=[early_stop, checkpoint, reduce_lr]
    )
    
    # Predict
    y_pred_scaled = model.predict(X_test_seq, verbose=0)
    y_pred = scaler_y.inverse_transform(y_pred_scaled)
    y_test_actual = scaler_y.inverse_transform(y_test_seq)
    
    # Metrics
    mae = mean_absolute_error(y_test_actual, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred))
    r2 = r2_score(y_test_actual, y_pred)
    mape = np.mean(np.abs((y_test_actual - y_pred) / y_test_actual)) * 100
    
    # Save scalers
    scaler_path = os.path.join(models_dir, "lstm_scalers.pkl")
    joblib.dump({'scaler_X': scaler_X, 'scaler_y': scaler_y, 'encoders': label_encoders}, scaler_path)
    
    print(f"\n✅ LSTM training complete.")
    print(f"Best model saved at: {best_model_path}")
    print(f"Scalers saved at: {scaler_path}")
    print(f"\n📊 Test Metrics:")
    print(f"MAE: {mae:.4f} | RMSE: {rmse:.4f} | R²: {r2:.4f} | MAPE: {mape:.2f}%")
    
    return mae, rmse, r2, mape


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    DATA_PATH = PROJECT_ROOT / "data" / "processed" / "feature_engineered.csv"
    
    print(f"Loading data from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded shape: {df.shape}")
    
    metrics = train_lstm_model(df)
    print("\nLSTM metrics:", metrics)
