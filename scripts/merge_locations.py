import json
import os

STATIONS_PATH = 'c:/Users/ashfa/Downloads/EXCEL/DemandPulse/src/data/stations.json'
CITIES_PATH = 'c:/Users/ashfa/Downloads/EXCEL/datasets/indian-cities-and-villages-master/indian-cities-and-villages-master/data.json'
OUTPUT_PATH = 'c:/Users/ashfa/Downloads/EXCEL/DemandPulse/src/data/combined_locations.json'

def merge_data():
    print(f"Loading stations from {STATIONS_PATH}...")
    with open(STATIONS_PATH, 'r', encoding='utf-8') as f:
        stations = json.load(f)
    
    # Format: [code, name] -> { "name": name, "type": "station", "code": code }
    combined = []
    seen_names = set()

    for code, name in stations:
        combined.append({
            "name": name,
            "type": "Railway Station",
            "code": code
        })
        seen_names.add(name.lower())

    print(f"Loading cities from {CITIES_PATH}...")
    with open(CITIES_PATH, 'r', encoding='utf-8') as f:
        cities_data = json.load(f)

    # cities_data is a list of states
    city_count = 0
    for state_obj in cities_data:
        state_name = state_obj.get('state', '')
        for district_obj in state_obj.get('districts', []):
            district_name = district_obj.get('district', '')
            for sub_dist_obj in district_obj.get('subDistricts', []):
                sub_dist_name = sub_dist_obj.get('subDistrict', '')
                for village in sub_dist_obj.get('villages', []):
                    if village.lower() not in seen_names:
                        combined.append({
                            "name": village,
                            "type": "City/Village",
                            "state": state_name,
                            "district": district_name,
                            "sub_district": sub_dist_name
                        })
                        seen_names.add(village.lower())
                        city_count += 1

    print(f"Total locations: {len(combined)} (Added {city_count} new cities/villages)")
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(combined, f, indent=2)
    print(f"Saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    merge_data()
