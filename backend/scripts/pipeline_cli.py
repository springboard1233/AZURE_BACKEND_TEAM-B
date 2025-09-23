import click
from train_model import train_forecast_model
from generate_forecast import generate_forecast
from recommend_capacity import recommend_capacity

@click.group()
def cli():
    pass

@cli.command()
def train():
    train_forecast_model()

@cli.command()
@click.option("--days", default=30, help="Days to forecast")
def forecast(days):
    generate_forecast(periods=days)

@cli.command()
def recommend():
    recommend_capacity()

if __name__ == "__main__":
    cli()
