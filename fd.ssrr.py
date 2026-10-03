import pandas as pd # type: ignore
import numpy as np # type: ignore
import os

# ---------------------------------------------------
# Load and merge all datasets from folder
# ---------------------------------------------------
def load_all_datasets(folder="datasets"):
    all_data = []

    for file in os.listdir(folder):
        if file.endswith(".xlsx"):
            path = os.path.join(folder, file)
            df = pd.read_excel(path)
            # Normalize demand column name
            if "Demand_Count" in df.columns and "Demand" not in df.columns:
                df = df.rename(columns={"Demand_Count": "Demand"})
            all_data.append(df)

    if not all_data:
        return pd.DataFrame()

    return pd.concat(all_data, ignore_index=True)

# ---------------------------------------------------
# Compute baseline demand
# ---------------------------------------------------
def compute_baseline(df):
    baseline = df[
        (df["Day_Type"] == "Weekday") &
        (df["Weather"] == "Normal") &
        (df["Festival"] == "No")
    ]["Demand"].mean()

    return baseline

# ---------------------------------------------------
# Compute factor indices from data
# ---------------------------------------------------
def compute_factor_index(df, column, baseline):
    index = {}
    for value in df[column].unique():
        index[value] = df[df[column] == value]["Demand"].mean() / baseline
    return index

# ---------------------------------------------------
# Build historical pressure distribution
# ---------------------------------------------------
def build_pressure_distribution(df, baseline, day_idx, weather_idx, fest_idx, season_idx, dest_idx=None):
    pressures = []

    for _, row in df.iterrows():
        # Handle missing destination in old rows/datasets
        d_factor = 1.0
        if dest_idx and "Destination" in row and row["Destination"] in dest_idx:
            d_factor = dest_idx[row["Destination"]]

        score = (
            baseline *
            day_idx[row["Day_Type"]] *
            weather_idx[row["Weather"]] *
            fest_idx[row["Festival"]] *
            season_idx[row["Season"]] *
            d_factor
        )
        pressures.append(score / baseline)

    return np.array(pressures)

# ---------------------------------------------------
# Compute scenario pressure
# ---------------------------------------------------
def compute_scenario_pressure(baseline, day_idx, weather_idx, fest_idx, season_idx, dest_idx,
                              day, weather, festival, season, destination=None):

    # Get destination factor (Default to Average/1.0 if new city)
    d_factor = 1.0
    if destination and dest_idx:
        # Fuzzy match or direct lookup? Direct for now.
        # Check title case
        dest_clean = str(destination).strip().title()
        if dest_clean in dest_idx:
            d_factor = dest_idx[dest_clean]
        else:
            # Fallback: maybe it's a new city.
            # strict teacher rule: "Why 1.0?" -> "No data for this city yet, assume baseline".
            d_factor = 1.0

    score = (
        baseline *
        day_idx[day] *
        weather_idx[weather] *
        fest_idx[festival] *
        season_idx[season] *
        d_factor
    )
    return score / baseline

# ---------------------------------------------------
# Main
# ---------------------------------------------------
def main():
    print("\nFD-SSR : Factor-Driven Scenario Stress Ranking\n")

    # AUTO LOAD DATA
    df = load_all_datasets("datasets")

    baseline = compute_baseline(df)

    day_idx = compute_factor_index(df, "Day_Type", baseline)
    weather_idx = compute_factor_index(df, "Weather", baseline)
    fest_idx = compute_factor_index(df, "Festival", baseline)
    season_idx = compute_factor_index(df, "Season", baseline)
    
    # Destination Index (Handle if column exists, else empty)
    dest_idx = {}
    if "Destination" in df.columns:
        dest_idx = compute_factor_index(df, "Destination", baseline)

    historical_pressures = build_pressure_distribution(
        df, baseline, day_idx, weather_idx, fest_idx, season_idx
    )

    print("Enter present travel scenario:")
    day = input("Day_Type (Weekday/Weekend/Holiday): ").strip().title()
    weather = input("Weather (Normal/Rainy/Extreme): ").strip().title()
    festival = input("Festival (Yes/No): ").strip().title()
    season = input("Season (Winter/Summer/Monsoon): ").strip().title()

    scenario_pressure = compute_scenario_pressure(
        baseline, day_idx, weather_idx, fest_idx, season_idx, dest_idx,
        day, weather, festival, season
    )

    percentile = (
        np.sum(historical_pressures <= scenario_pressure)
        / len(historical_pressures)
        * 100
    )

    print("\n========== RESULT ==========")
    print(f"Relative Demand Pressure Score : {round(scenario_pressure, 3)}")
    print(f"Historical Position            : {round(percentile, 2)} percentile")

    print("\nInterpretation:")
    print("Higher percentile → Higher demand pressure compared to historical data")
    print("Lower percentile → Lower demand pressure compared to historical data")

if __name__ == "__main__":
    main()
