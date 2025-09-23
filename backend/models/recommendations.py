from .generate_forecast import generate_forecast

def capacity_recommendations(days=7, region=None, resource_type=None):
    forecast = generate_forecast(days, region=region, resource_type=resource_type)

    recommendations = []
    for entry in forecast:
        usage = entry["predicted_cpu"]
        if usage > 80:
            rec = "Scale Up"
        elif usage < 40:
            rec = "Scale Down"
        else:
            rec = "Maintain Capacity"
        recommendations.append({
            "date": entry["date"],
            "predicted_cpu": round(usage, 2),
            "recommendation": rec
        })

    return recommendations
