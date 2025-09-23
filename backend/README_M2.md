# (if not yet installed)
python -m pip install -r requirements.txt
# create processed dataset
python scripts\feature_engineering.py
# start the API server
python api\app.py
