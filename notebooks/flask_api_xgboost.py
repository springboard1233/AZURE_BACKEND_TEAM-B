from flask import Flask, jsonify, request, render_template
import pandas as pd
import numpy as np
from datetime import timedelta
import pickle  # if you saved a trained model

app = Flask(__name__)

# Load dataset once at startup
data = pd.read_csv('milestone2_feature_engineered.csv', parse_dates=['date'])
# Load trained model
with open('xgb_model.pkl', 'rb') as f:
    model = pickle.load(f)
# Serve frontend
@app.route('/')
def home():
    return render_template('index1.html')

@app.route('/get_forecast', methods=['GET'])
def get_forecast():
    Region = request.args.get('Region')
    service = request.args.get('service')
    horizon = int(request.args.get('horizon', 7))

    # Filter dataset
    df = data[(data['region'] == Region) & (data['service'] == service)]

    # Aggregate by date
    df = df.groupby('date')['usage'].sum().reset_index()

    # Historical data
    actual_dates = df['date'].dt.strftime('%Y-%m-%d').tolist()
    actual_values = df['usage'].tolist()

    # Generate forecast for `horizon` days
    last_date = df['date'].max()
    future_dates = [(last_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, horizon+1)]

    # Predict using your trained model (replace this with actual model prediction logic)
    # Example: if model.predict() expects array of past values
    # Prepare rolling forecast
    recent_values = df['usage'].values[-30:]  # last 30 days
    predicted_values = []

    for i in range(horizon):
        # Model expects input shape (1, 30)
        input_array = recent_values[-30:].reshape(1, -1)
        pred = model.predict(input_array)[0]  # get single predicted value
        predicted_values.append(pred)
        recent_values = np.append(recent_values, pred)  # append to slide window

    return jsonify({
        "dates": actual_dates + future_dates,
        "actual": actual_values,
        "predicted": predicted_values  

    })

if __name__ == '__main__':
    app.run(debug=True)
