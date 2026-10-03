import pandas as pd
import os
import numpy as np

def calculate_max_score():
    folder = "datasets"
    all_data = []
    for file in os.listdir(folder):
        if file.endswith(".xlsx"):
            path = os.path.join(folder, file)
            df = pd.read_excel(path)
            all_data.append(df)
    
    df = pd.concat(all_data, ignore_index=True)
    
    # Compute baseline
    baseline = df[
        (df["Day_Type"] == "Weekday") &
        (df["Weather"] == "Normal") &
        (df["Festival"] == "No")
    ]["Demand"].mean()
    
    print(f"Baseline: {baseline}")
    
    # Compute max indices
    cols = ["Day_Type", "Weather", "Festival", "Season", "Destination"]
    max_prod = 1.0
    for col in cols:
        if col in df.columns:
            idx = df.groupby(col)["Demand"].mean() / baseline
            m = idx.max()
            print(f"Max Factor for {col}: {m:.3f} ({idx.idxmax()})")
            max_prod *= m
            
    print(f"Theoretical Max Multiplication (Raw Score): {max_prod:.3f}")

if __name__ == "__main__":
    calculate_max_score()
