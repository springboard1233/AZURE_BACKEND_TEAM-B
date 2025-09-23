from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

# Mock data for testing
def generate_mock_data(days=30):
    data = []
    base_date = datetime.now() - timedelta(days=days)

    for i in range(days):
        date = base_date + timedelta(days=i)
        data.append({
            'date': date.strftime('%Y-%m-%d'),
            'usage_cpu': round(random.uniform(20, 80), 2),
            'usage_storage': round(random.uniform(30, 90), 2),
            'users_active': random.randint(100, 1000),
            'region': random.choice(['East US', 'West US', 'Central US']),
            'resource_type': random.choice(['VM', 'Storage', 'Network']),
            'usage_cpu_roll_mean_3': round(random.uniform(25, 75), 2),
            'usage_cpu_roll_mean_7': round(random.uniform(30, 70), 2)
        })

    return data

@app.route('/api/raw-data')
def get_raw_data():
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    region = request.args.get('region')

    data = generate_mock_data(30)

    # Apply filters
    if region:
        data = [d for d in data if d['region'] == region]

    return jsonify(data)

@app.route('/api/features')
def get_features():
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    region = request.args.get('region')

    data = generate_mock_data(30)

    # Apply filters
    if region:
        data = [d for d in data if d['region'] == region]

    return jsonify(data)

@app.route('/api/forecast')
def get_forecast():
    days = int(request.args.get('days', 30))
    region = request.args.get('region')
    resource_type = request.args.get('resource_type')

    forecast_data = []
    base_date = datetime.now()

    for i in range(days):
        date = base_date + timedelta(days=i)
        forecast_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'predicted_cpu': round(random.uniform(25, 75), 2),
            'region': region or 'East US',
            'resource_type': resource_type or 'VM'
        })

    return jsonify(forecast_data)

@app.route('/api/recommendations')
def get_recommendations():
    days = int(request.args.get('days', 7))
    region = request.args.get('region')
    resource_type = request.args.get('resource_type')

    recommendations = []
    base_date = datetime.now()

    for i in range(days):
        date = base_date + timedelta(days=i)
        recommendations.append({
            'date': date.strftime('%Y-%m-%d'),
            'recommendation': f"Increase capacity by {random.randint(10, 30)}% for {region or 'East US'} region",
            'predicted_cpu': round(random.uniform(60, 90), 2),
            'region': region or 'East US',
            'resource_type': resource_type or 'VM'
        })

    return jsonify(recommendations)

@app.route('/api/correlations')
def get_correlations():
    region = request.args.get('region')
    resource_type = request.args.get('resource_type')

    # Mock correlation matrix
    features = ['usage_cpu', 'usage_storage', 'users_active', 'economic_index', 'cloud_market_demand']
    matrix = [
        [1.0, 0.3, 0.5, -0.2, 0.1],
        [0.3, 1.0, 0.4, 0.1, -0.3],
        [0.5, 0.4, 1.0, 0.2, 0.0],
        [-0.2, 0.1, 0.2, 1.0, 0.6],
        [0.1, -0.3, 0.0, 0.6, 1.0]
    ]

    target_correlations = {
        'usage_storage': 0.3,
        'users_active': 0.5,
        'economic_index': -0.2,
        'cloud_market_demand': 0.1
    }

    return jsonify({
        'features': features,
        'matrix': matrix,
        'target_correlations': target_correlations,
        'region': region,
        'resource_type': resource_type
    })

@app.route('/api/regions')
def get_regions():
    return jsonify({
        'regions': ['East US', 'West US', 'Central US', 'North Europe', 'West Europe'],
        'resource_types': ['VM', 'Storage', 'Network', 'Database', 'Web App']
    })

if __name__ == '__main__':
    print("Starting mock API server...")
    print("Available endpoints:")
    print("  /api/raw-data")
    print("  /api/features")
    print("  /api/forecast")
    print("  /api/recommendations")
    print("  /api/correlations")
    print("  /api/regions")
    app.run(debug=True, port=5000)
