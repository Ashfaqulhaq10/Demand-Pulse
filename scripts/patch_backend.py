import os

api_path = r'c:\Users\ashfa\Downloads\EXCEL\backend_api.py'
with open(api_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # 1. Add global variable
    if 'users: list[dict[str, str]] = []' in line:
        new_lines.append(line)
        new_lines.append('alerts: list[Any] = [] # Using Any to avoid restrictive linting on slicing/appending\n')
        new_lines.append('combined_locations: list[dict[str, Any]] = []\n')
        # Skip next line if it's the duplicate alerts definition we found
        continue
    if 'alerts: list[Any] = []' in line and i > 87: # Simple guard
         continue
    
    # 2. Add loader function
    if 'def _clean_city(city_name: str) -> str:' in line:
        new_lines.append('''def load_combined_locations():
    """Loads and merges railway stations and cities/villages."""
    global combined_locations
    print("Loading and merging locations...")
    import json
    locations = []
    seen = set()
    try:
        s_p = os.path.join("DemandPulse", "src", "data", "stations.json")
        if os.path.exists(s_p):
            with open(s_p, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    if isinstance(item, list) and len(item) >= 2:
                        n, c = str(item[1]), str(item[0])
                        locations.append({"name": n, "type": "Railway Station", "code": c})
                        seen.add(n.lower())
    except Exception as e: print(f"Error stations: {e}")
    try:
        c_p = os.path.join("datasets", "indian-cities-and-villages-master", "indian-cities-and-villages-master", "data.json")
        if os.path.exists(c_p):
            with open(c_p, "r", encoding="utf-8") as f:
                for st in json.load(f):
                    s_n = st.get("state", "")
                    for d in st.get("districts", []):
                        d_n = d.get("district", "")
                        for sd in d.get("subDistricts", []):
                            sd_n = sd.get("subDistrict", "")
                            for v in sd.get("villages", []):
                                v_n = str(v) if not isinstance(v, (list, dict)) else ""
                                if v_n and v_n.lower() not in seen:
                                    locations.append({"name": v_n, "type": "City/Village", "state": s_n, "district": d_n, "sub_district": sd_n})
                                    seen.add(v_n.lower())
    except Exception as e: print(f"Error cities: {e}")
    combined_locations = locations
    print(f"Loaded {len(combined_locations)} locations.")

''')
        new_lines.append(line)
        continue

    # 3. Add search endpoint
    if 'def get_alerts(username: str | None = None):' in line:
        # Find end of this function
        new_lines.append(line)
        for j in range(i+1, i+5):
            if 'return alerts' in lines[j]:
                new_lines.append(lines[j])
                new_lines.append('''
@app.get("/search-locations")
def search_locations(q: str):
    """Filters combined_locations based on query string."""
    if not q or len(q) < 1: return []
    query = q.lower()
    results = []
    for loc in combined_locations:
        if query in loc["name"].lower() or (loc.get("code") and query in loc.get("code", "").lower()):
            results.append(loc)
        if len(results) >= 15: break
    return results
''')
                # We need to skip the lines we just added manually to avoid duplication
                # But it's easier to just flag it.
                break
        continue
    # Skip lines we've already handled inside the search endpoint block
    if 'return alerts' in line and i > 570 and any('@app.get("/search-locations")' in l for l in new_lines[-5:]):
        continue

    # 4. Update startup event
    if 'load_users()' in line:
        new_lines.append(line)
        new_lines.append('    load_combined_locations()\n')
        continue

    new_lines.append(line)

with open(api_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Updated backend_api.py successfully.")
