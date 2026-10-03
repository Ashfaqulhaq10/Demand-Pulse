from fastapi import FastAPI, HTTPException # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from pydantic import BaseModel # type: ignore
from typing import Any, cast, List
import importlib.util
import os
import sys
import numpy as np # type: ignore
import threading
import time
import json
import urllib.request
import urllib.parse
import pandas as pd  # type: ignore
from datetime import datetime, timedelta
import uuid
try:
    from dotenv import load_dotenv # type: ignore
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    load_dotenv(dotenv_path=_env_path, override=True)
    # print("dotenv loaded from:", _env_path)
    # print("dotenv loaded, OPENCAGE_API_KEY=", os.environ.get("OPENCAGE_API_KEY"))
    # print("dotenv loaded, OPENWEATHER_API_KEY=", os.environ.get("OPENWEATHER_API_KEY"))
    # print("dotenv loaded, CALENDARIFIC_API_KEY=", os.environ.get("CALENDARIFIC_API_KEY"))
except Exception as e:
    # print("dotenv load error:", e)
    pass

# Helper for resolving keys
def get_config_key(key_name: str, default: str = "") -> str:
    return os.environ.get(key_name) or default

# Weather & Holiday Caches
weather_cache = {} # {city: {"weather": condition, "expiry": timestamp}}
holiday_cache = {} # {date_str: "Yes"|"No"}

# --- Load FD-SSR Logic dynamically ---
# Since filename has dots (fd.ssrr.py), we load it using spec
try:
    spec = importlib.util.spec_from_file_location("fd_logic", "fd.ssrr.py")
    if spec is None or spec.loader is None:
        raise ImportError("Could not find or load fd.ssrr.py")
    fd_logic = importlib.util.module_from_spec(spec) # type: ignore
    sys.modules["fd_logic"] = fd_logic
    spec.loader.exec_module(fd_logic) # type: ignore
except Exception as e:
    print(f"CRITICAL ERROR loading fd.ssrr.py: {e}")
    fd_logic = None

app = FastAPI()

# simple request logging - useful for debugging CORS/500 issues
@app.middleware("http")
async def log_requests(request, call_next):
    # print(f"Incoming {request.method} {request.url}")
    try:
        response = await call_next(request)
    except Exception as exc:
        print(f"Exception during request: {exc}")
        raise
    # print(f"Response status {response.status_code} for {request.url}")
    return response

from fastapi.responses import JSONResponse # type: ignore

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    # ensure CORS headers present even on errors
    print(f"Unhandled error on {request.url}: {exc}")
    content = {"detail": str(exc)}
    return JSONResponse(status_code=500, content=content)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model_states: dict[str, dict[str, Any]] = {
    "Bus": {}, "Train": {}, "Flight": {}
}
user_routes: list[dict[str, str]] = []
users: list[dict[str, str]] = []
alerts: list[Any] = [] # Using Any to avoid restrictive linting on slicing/appending
combined_locations: list[dict[str, Any]] = []
alerts: list[Any] = [] # Using Any to avoid restrictive linting on slicing/appending
ROUTES_FILE = "user_routes.xlsx"
USERS_FILE = "users.xlsx"

# Search Cache
SEARCH_CACHE = {} 
CACHE_TTL = 300 # 5 minutes

class ScenarioInput(BaseModel):
    day: str
    weather: str
    festival: str
    season: str
    travel_type: str = "Bus" # Default to Bus
    destination: str | None = None

class UserRoute(BaseModel):
    username: str
    origin: str
    destination: str
    travel_type: str

class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str

class UserLogoutRequest(BaseModel):
    username: str

class UserPreferences(BaseModel):
    username: str
    origin: str
    destination: str

class UserLogin(BaseModel):
    username: str
    password: str

class Alert(BaseModel):
    username: str
    timestamp: str
    route: str
    level: str
    message: str
    url: str | None = None
    travel_type: str = "Bus"
    id: str | None = None

def get_datasets_signature(folder="datasets"):
    """Returns a signature of the folder state (filenames + mtimes)."""
    if not os.path.exists(folder):
        return None
    
    signature = {}
    try:
        for filename in os.listdir(folder):
            if filename.endswith(".xlsx"):
                filepath = os.path.join(folder, filename)
                signature[filename] = os.path.getmtime(filepath)
    except Exception:
        pass
    return signature

def load_model_for(transport: str):
    """Loads datasets and trains the model for a specific transport."""
    if fd_logic is None:
        return

    try:
        folder_path = os.path.join("datasets", transport)
        if not os.path.exists(folder_path):
             print(f"WARNING: '{folder_path}' folder not found.")
             return
        
        # Check if folder is empty
        files = [f for f in os.listdir(folder_path) if f.endswith(".xlsx")]
        if not files:
            print(f"WARNING: No datasets found in '{folder_path}'. Model for {transport} will be empty.")
            model_states[transport] = {}
            return

        df = cast(Any, fd_logic).load_all_datasets(folder_path)
        baseline = cast(Any, fd_logic).compute_baseline(df)
        
        state = {}
        state["baseline"] = baseline
        state["day_idx"] = cast(Any, fd_logic).compute_factor_index(df, "Day_Type", baseline)
        state["weather_idx"] = cast(Any, fd_logic).compute_factor_index(df, "Weather", baseline)
        state["fest_idx"] = cast(Any, fd_logic).compute_factor_index(df, "Festival", baseline)
        state["season_idx"] = cast(Any, fd_logic).compute_factor_index(df, "Season", baseline)
        
        if "Destination" in df.columns:
            state["dest_idx"] = cast(Any, fd_logic).compute_factor_index(df, "Destination", baseline)
        else:
            state["dest_idx"] = {}

        state["historical_pressures"] = cast(Any, fd_logic).build_pressure_distribution(
            df, baseline, 
            state["day_idx"], 
            state["weather_idx"], 
            state["fest_idx"], 
            state["season_idx"],
            state["dest_idx"]
        )
        
        model_states[transport] = state
        print(f"{transport} model loaded successfully with {len(df)} rows!")
        
    except Exception as e:
        print(f"Error loading {transport} model: {e}")

def watch_datasets(interval=5):
    """Watches the datasets subfolders for changes and reloads models."""
    last_signatures = {
        "Bus": get_datasets_signature("datasets/Bus"),
        "Train": get_datasets_signature("datasets/Train"),
        "Flight": get_datasets_signature("datasets/Flight")
    }
    
    while True:
        time.sleep(interval)
        for transport in ["Bus", "Train", "Flight"]:
            folder = os.path.join("datasets", transport)
            current_sig = get_datasets_signature(folder)
            
            if current_sig != last_signatures[transport]:
                print(f"Change detected in {folder}! Reloading {transport} model...")
                load_model_for(transport)
                last_signatures[transport] = current_sig

def save_routes():
    """Saves user routes to a local Excel file."""
    try:
        df = pd.DataFrame(user_routes)
        df.to_excel(ROUTES_FILE, index=False)
        # print(f"Saved {len(user_routes)} routes to {ROUTES_FILE}")
    except Exception as e:
        print(f"Error saving routes: {e}")

def load_routes():
    """Loads user routes from a local Excel file."""
    global user_routes
    if os.path.exists(ROUTES_FILE):
        try:
            df = pd.read_excel(ROUTES_FILE)
            user_routes = df.to_dict('records')
            # print(f"Loaded {len(user_routes)} user routes from Excel.")
        except Exception as e:
            print(f"Error loading routes from Excel: {e}")
            user_routes = []
    else:
        user_routes = []
        # print("No user_routes.xlsx found. Starting fresh.")

def save_users():
    """Saves users to a local Excel file."""
    try:
        df = pd.DataFrame(users)
        df.to_excel(USERS_FILE, index=False)
        # print(f"Saved {len(users)} users to {USERS_FILE}")
    except Exception as e:
        print(f"Error saving users: {e}")

def load_users():
    load_combined_locations()
    """Loads users from a local Excel file with sanitization."""
    global users
    if os.path.exists(USERS_FILE):
        try:
            df = pd.read_excel(USERS_FILE)
            # Ensure all columns are present and clean data
            df = df.fillna("")
            users_list = []
            for _, row in df.iterrows():
                user_dict = {}
                for col in df.columns:
                    # Convert everything to string and strip whitespace
                    user_dict[col] = str(row[col]).strip()
                users_list.append(user_dict)
            users = users_list
            # print(f"Loaded {len(users)} users from Excel (sanitized).")
        except Exception as e:
            print(f"Error loading users from Excel: {e}")
            users = []
    else:
        users = []
        # print("No users.xlsx found. Starting fresh.")

def load_combined_locations():
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
    try:
        a_p = os.path.join("datasets", "airports-master", "airports-master", "airports.csv")
        if os.path.exists(a_p):
            df_airports = pd.read_csv(a_p)
            # Filter for closed or military if needed, but here we include all as requested
            for _, row in df_airports.iterrows():
                name = str(row.get("name", ""))
                iata = str(row.get("iataCode", "")) if pd.notna(row.get("iataCode")) else ""
                country = str(row.get("countryCode", ""))
                state = str(row.get("state", "")) if pd.notna(row.get("state")) else ""
                
                municipality = str(row.get("municipality", "")) if pd.notna(row.get("municipality")) else ""
                
                # We skip very small airports without names or IATA if it's too much data,
                # but user said "all airports names", so we include those with a name.
                if name and name.lower() not in seen:
                    # Enrich name with IATA and Municipality for easier searching
                    display_name = name
                    if iata: display_name += f" ({iata})"
                    if municipality and municipality.lower() not in name.lower():
                        display_name += f" - {municipality}"
                    # The original code was missing the append and seen.add for this dataset
                    locations.append({
                        "name": display_name,
                        "type": "Airport",
                        "code": iata,
                        "state": state,
                        "country": country,
                        "municipality": municipality
                    })
                    seen.add(name.lower())
    except Exception as e: print(f"Error airports1: {e}")

    # Second Airport Dataset Integration
    try:
        a_p2 = os.path.join("datasets", "airports.csv")
        if os.path.exists(a_p2):
            df_airports2 = pd.read_csv(a_p2)
            for _, row in df_airports2.iterrows():
                name = str(row.get("name", ""))
                iata = str(row.get("iata_code", "")) if pd.notna(row.get("iata_code")) else ""
                ident = str(row.get("ident", "")) if pd.notna(row.get("ident")) else ""
                code = iata or ident
                municipality = str(row.get("municipality", "")) if pd.notna(row.get("municipality")) else ""
                country = str(row.get("iso_country", ""))
                state = str(row.get("iso_region", ""))
                
                if name and name.lower() not in seen:
                    display_name = name
                    if code: display_name += f" ({code})"
                    if municipality and municipality.lower() not in name.lower():
                        display_name += f" - {municipality}"

                    locations.append({
                        "name": display_name,
                        "type": "Airport",
                        "code": code,
                        "state": state,
                        "country": country,
                        "municipality": municipality
                    })
                    seen.add(name.lower())
    except Exception as e: print(f"Error airports2: {e}")

    combined_locations = locations
    print(f"Loaded {len(combined_locations)} locations.")

def _clean_city(city_name: str) -> str:
    """Strips common Indian railway station tokens to get a plain city name."""
    tokens = [
        "Junction", "Central", "Terminus", "Road", "Cantt", "Cantonment",
        "City", "Town", "Main", "Jn", "Jn.", "Jct",
        "Railway Station", "Railway", "Station", "Stn", "Stn."
    ]
    s = city_name
    for t in tokens:
        # case-insensitive replace
        import re
        s = re.sub(r'(?i)\b' + re.escape(t) + r'\b', '', s)
    return " ".join(s.split()).strip()

def get_owm_weather(city_name):
    """Fetches weather from OpenWeatherMap."""
    key = get_config_key("OPENWEATHER_API_KEY")
    if not key:
        return None

    try:
        safe_city = urllib.parse.quote(_clean_city(city_name))
        url = f"https://api.openweathermap.org/data/2.5/weather?q={safe_city}&appid={key}"
        
        with urllib.request.urlopen(url) as resp:
            data = json.loads(resp.read().decode())
            if not data.get("weather"):
                return None
            
            main_weather = data["weather"][0]["main"]
            # Map OWM to DemandPulse categories
            if main_weather in ["Rain", "Drizzle", "Thunderstorm"]:
                return "Rainy"
            elif main_weather in ["Extreme", "Severe", "Tornado", "Squall"]:
                return "Extreme"
            return "Normal"
    except Exception as e:
        # print(f"OpenWeatherMap error for {city_name}: {e}")
        return None

def get_meteo_weather(city_name):
    """Fetches weather from Open-Meteo (Original fallback logic)."""
    try:
        # 1. Geocoding
        safe_city = urllib.parse.quote(_clean_city(city_name))
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={safe_city}&count=1&language=en&format=json"
        
        with urllib.request.urlopen(geo_url) as resp:
            geo_data = json.loads(resp.read().decode())
            if not geo_data.get("results"):
                return "Normal"
            
            lat = geo_data["results"][0]["latitude"]
            lon = geo_data["results"][0]["longitude"]

        # 2. Forecast
        today_str = datetime.now().strftime("%Y-%m-%d")
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=weather_code&start_date={today_str}&end_date={today_str}&timezone=auto"
        
        with urllib.request.urlopen(weather_url) as resp:
            weather_data = json.loads(resp.read().decode())
            if not weather_data.get("daily") or not weather_data["daily"].get("weather_code"):
                return "Normal"
            
            code = weather_data["daily"]["weather_code"][0]
            if 51 <= code <= 67 or 80 <= code <= 82: return "Rainy"
            elif code >= 95 or 71 <= code <= 77: return "Extreme"
            return "Normal"
    except Exception:
        return "Normal"

def get_holiday_status(year, month, day):
    """Checks if a date is a festival/holiday using Calendarific."""
    date_key = f"{year}-{month:02d}-{day:02d}"
    
    # 1. Check Cache
    if date_key in holiday_cache:
        return holiday_cache[date_key]

    # 2. Hardcoded Fallbacks for common India holidays
    static_holidays = ["01-01", "01-26", "08-15", "10-02", "12-25", "11-01"]
    short_date = f"{month:02d}-{day:02d}"
    
    key = get_config_key("CALENDARIFIC_API_KEY")
    try:
        # 3. Call Calendarific API
        url = f"https://calendarific.com/api/v2/holidays?api_key={key}&country=IN&year={year}&month={month}&day={day}"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "DemandPulse/1.0")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            # Calendarific returns a list of holidays in ['response']['holidays']
            holidays = data.get("response", {}).get("holidays", [])
            status = "Yes" if len(holidays) > 0 else "No"
            holiday_cache[date_key] = status
            return status
    except Exception as e:
        # print(f"Calendarific API error: {e}")
        # Fallback to static list
        return "Yes" if short_date in static_holidays else "No"

def get_real_weather(city_name):
    """Fetches real-time weather with multi-API fallback."""
    now = time.time()
    
    # 1. Check Cache
    if city_name in weather_cache:
        cached = weather_cache[city_name]
        if now < cached["expiry"]:
            return cached["weather"]

    # 2. Try OpenWeatherMap First
    condition = get_owm_weather(city_name)
    
    # 3. Fallback to Open-Meteo if OWM fails
    if condition is None:
        # print(f"Falling back to Open-Meteo for {city_name}")
        condition = get_meteo_weather(city_name)

    # 4. Update Cache
    weather_cache[city_name] = {
        "weather": condition,
        "expiry": now + 3600
    }
    return condition

def process_route_notification(username: str, origin: str, dest: str, travel_type: str):
    """Processes demand check and adds an alert if necessary for a specific route."""
    state = model_states.get(travel_type)
    if not state or not state.get("baseline") or fd_logic is None:
        return

    try:
        dest = dest.strip().title()
        now = datetime.now()
        is_weekend = now.weekday() >= 5
        day_type = "Weekend" if is_weekend else "Weekday"
        
        # Simple season mapping
        month = now.month
        if 3 <= month <= 6: season = "Summer"
        elif 7 <= month <= 10: season = "Monsoon"
        else: season = "Winter"

        # FETCH REAL WEATHER & HOLIDAY
        weather_cond = get_real_weather(dest)
        is_fest = get_holiday_status(now.year, now.month, now.day)
        
        # Predict demand
        score = cast(Any, fd_logic).compute_scenario_pressure(
            state["baseline"],
            state["day_idx"],
            state["weather_idx"],
            state["fest_idx"],
            state["season_idx"],
            state["dest_idx"],
            day_type, weather_cond, is_fest, season, dest
        )
        
        if score >= 1.3: # BUSY or VERY BUSY
            level = "VERY BUSY" if score >= 1.6 else "BUSY"
            
            # Determine simple reason
            day_factor = state["day_idx"].get(day_type, 1.0)
            season_factor = state["season_idx"].get(season, 1.0)
            dest_factor = state["dest_idx"].get(dest, 1.0)
            
            reason = "high travel season"
            if day_factor > 1.1: reason = f"{day_type} rush"
            if dest_factor > 1.2: reason = f"high demand for {dest}"
            
            alert_msg = f"Tickets for {travel_type} from {origin} to {dest} are selling fast! It is {level} due to {reason}."
            
            # Generate redirect URL
            redirect_url = "https://www.redbus.in" if travel_type == "Bus" else ("https://www.makemytrip.com/flights/" if travel_type == "Flight" else "https://www.confirmtkt.com")
            
            # Avoid duplicates: only add if not already in recent alerts for THIS user
            alert_count = len(alerts)
            recent_alerts = [alerts[i] for i in range(max(0, alert_count-20), alert_count)]
            exists = any(a["username"] == username and a.get("travel_type") == travel_type and a["level"] == level and dest in a["message"] and origin in a["message"] for a in recent_alerts)
            
            if not exists:
                print(f"NOTIFICATION SENT to {username}: {alert_msg}")
                alerts.append({
                    "id": str(uuid.uuid4()),
                    "username": username,
                    "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                    "route": f"{origin} to {dest}",
                    "level": level,
                    "message": alert_msg,
                    "url": redirect_url,
                    "travel_type": travel_type
                })
                # Trim alerts
                if len(alerts) > 500:
                    alerts.pop(0)
    except Exception as e:
        print(f"Error processing notification for {username}: {e}")

def cleanup_old_alerts():
    """Removes alerts older than 3 days."""
    global alerts
    threshold = datetime.now() - timedelta(days=3)
    original_count = len(alerts)
    
    # Filter alerts. Keep if parsing fails (safety) or if newer than 3 days.
    new_alerts = []
    for a in alerts:
        try:
            ts = datetime.strptime(a["timestamp"], "%Y-%m-%d %H:%M:%S")
            if ts > threshold:
                new_alerts.append(a)
        except Exception:
            new_alerts.append(a) # Keep malformed timestamps for safety
    
    alerts = new_alerts
    if len(alerts) < original_count:
        print(f"Cleaned up {original_count - len(alerts)} old alerts.")

def notification_worker():
    """Background worker that checks demand for saved routes and sends alerts."""
    # print("Starting notification service...")
    last_cleanup = 0
    while True:
        # Run cleanup every hour
        if time.time() - last_cleanup > 3600:
            cleanup_old_alerts()
            last_cleanup = time.time()

        if user_routes:
            for route in user_routes:
                process_route_notification(
                    route.get("username", "system"),
                    route.get("origin", "Search Location"),
                    route["destination"],
                    route.get("travel_type", "Bus")
                )
        
        # Check every 6 minutes for background (login checks are immediate)
        time.sleep(360)

def init_background():
    print("Background initialization started...")
    for transport in ["Bus", "Train", "Flight"]:
        load_model_for(transport)
        
    load_routes()
    load_users()
    load_combined_locations()
    
    # Start watcher thread
    watcher_thread = threading.Thread(target=watch_datasets, daemon=True)
    watcher_thread.start()

    # Start notification thread
    notification_thread = threading.Thread(target=notification_worker, daemon=True)
    notification_thread.start()
    print("Background initialization complete.")

@app.on_event("startup")
def startup_event():
    # Start all heavy database and model loading in a background thread
    # so Uvicorn can immediately bind the port for Render.
    init_thread = threading.Thread(target=init_background, daemon=True)
    init_thread.start()

@app.get("/")
def read_root():
    return {"status": "success", "message": "DemandPulse Backend API is running."}

@app.post("/register")
def register(user_data: UserRegister):
    # Normalize inputs
    reg_username = user_data.username.strip()
    
    if any(u["username"] == reg_username for u in users):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = {
        "username": reg_username,
        "password": user_data.password.strip(),
        "full_name": user_data.full_name.strip(),
        "origin": "",
        "destination": "",
        "last_login": "",
        "last_logout": ""
    }
    users.append(new_user)
    save_users()
    return {"status": "success", "message": "Full access granted! Welcome to DemandPulse."}

@app.post("/login")
def login(login_data: UserLogin):
    global users
    # Normalize inputs
    input_user = login_data.username.strip()
    input_pass = login_data.password.strip()
    
    user_idx = next((i for i, u in enumerate(users) if u["username"] == input_user and u["password"] == input_pass), None)
    
    if user_idx is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    user = users[user_idx]
    # Update last login time
    user["last_login"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    save_users()
    
    # TRIGGER IMMEDIATE DEMAND CHECK for user preferences
    if user.get("origin") and user.get("destination"):
        # print(f"Triggering login demand check for {user['username']}")
        # We try all three modes
        threading.Thread(target=process_route_notification, args=(user["username"], user["origin"], user["destination"], "Bus"), daemon=True).start()
        threading.Thread(target=process_route_notification, args=(user["username"], user["origin"], user["destination"], "Train"), daemon=True).start()
        threading.Thread(target=process_route_notification, args=(user["username"], user["origin"], user["destination"], "Flight"), daemon=True).start()
    
    return {
        "status": "success", 
        "message": f"Welcome back, {user['full_name']}!",
        "user": {
            "username": user["username"], 
            "full_name": user["full_name"],
            "origin": user.get("origin", ""),
            "destination": user.get("destination", "")
        }
    }

@app.get("/alerts")
def get_alerts(username: str | None = None, transport: str | None = None):
    results = alerts
    if username:
        results = [a for a in results if a.get("username") == username]
    if transport:
        # Strict filtering to ensure no leakage
        results = [a for a in results if str(a.get("travel_type")).lower() == transport.lower()]
    return results

@app.delete("/alerts/{alert_id}")
def delete_alert(alert_id: str):
    global alerts
    alerts = [a for a in alerts if a.get("id") != alert_id]
    return {"status": "success", "message": "Alert deleted"}

@app.post("/logout")
def logout(data: UserLogoutRequest):
    global users
    user_idx = next((i for i, u in enumerate(users) if u["username"] == data.username), None)
    if user_idx is not None:
        users[user_idx]["last_logout"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        save_users()
    return {"status": "success", "message": "Logged out successfully."}

@app.post("/update-preferences")
def update_preferences(prefs: UserPreferences):
    global users
    user_idx = next((i for i, u in enumerate(users) if u["username"] == prefs.username), None)
    if user_idx is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    users[user_idx]["origin"] = prefs.origin
    users[user_idx]["destination"] = prefs.destination
    save_users()
    return {"status": "success", "message": "Preferences updated."}

@app.post("/save-route")
def save_user_route(route: UserRoute):
    """Saves a route for background notification monitoring."""
    route_data = route.dict()
    # Check if this route for this user already exists
    if not any(r["username"] == route.username and r["origin"] == route.origin and r["destination"] == route.destination and r["travel_type"] == route.travel_type for r in user_routes):
        user_routes.append(route_data)
        save_routes()
        return {"status": "success", "message": f"Route {route.origin} to {route.destination} saved for alerts."}
    return {"status": "exists", "message": "Route already saved."}

@app.get("/search-locations")
async def search_locations(q: str, transport: str | None = None):
    """
    Advanced location search:
    1. Checks in-memory cache.
    2. Searches local JSON dataset with scoring.
    3. Integrates OpenCage Geocoding API (India only, building filtered).
    4. Merges, deduplicates, and ranks results.
    """
    if not q or len(q) < 1: return []
    
    # Cache key includes transport to prevent mixed suggestions
    cache_key = f"{q}:{transport or 'all'}"
    
    # 1. Simple In-Memory Cache Check
    now = time.time()
    if cache_key in SEARCH_CACHE:
        entry = SEARCH_CACHE[cache_key]
        if now - entry["ts"] < CACHE_TTL:
            return entry["data"]

    query = q.lower().strip()
    is_station_query = any(t in query for t in ["station", "junction", "jn", "stn"])
    
    results = []
    seen_names = set()

    # 2. Local Search Scoring
    for loc in combined_locations:
        is_airport = loc["type"] == "Airport"
        
        # STRICT REQUIREMENT: If transport is Flight, only show Airports
        if transport == "Flight":
            if not is_airport:
                continue # Skip all cities and stations in flight mode
        elif transport in ["Train", "Bus"]:
            if is_airport:
                continue # Skip airports in land transport mode (optional, but requested implicitly)

        score = 0
        name_low = loc["name"].lower()
        mun_low = str(loc.get("municipality", "")).lower()
        iata_low = str(loc.get("code", "")).lower()
        
        # Match name or municipality or IATA code
        if query in name_low or (mun_low and query in mun_low) or (iata_low and query == iata_low):
            score += 50
            if name_low.startswith(query) or mun_low.startswith(query): score += 30 
            
            # Transport-specific prioritization
            if transport == "Flight":
                # We already filtered to only airports, but we can still rank by name vs municipality
                if iata_low == query: score += 100
            elif transport in ["Train", "Bus"]:
                if loc["type"] == "Railway Station": score += 40
            
            if is_station_query and loc["type"] == "Railway Station":
                score += 40
            
            results.append({
                "name": loc["name"],
                "type": loc["type"],
                "state": loc.get("state"),
                "district": loc.get("district"),
                "score": score
            })

    # 3. OpenCage API Call (Only for longer queries)
    OPENCAGE_KEY = os.environ.get("OPENCAGE_API_KEY")
    if OPENCAGE_KEY and len(query) >= 4:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=3.0) as client:
                safe_q = urllib.parse.quote_plus(f"{query}, India")
                # no_annotations=1 for speed, limit=10 to allow our own filtering
                url = f"https://api.opencagedata.com/geocode/v1/json?q={safe_q}&key={OPENCAGE_KEY}&limit=10&countrycode=in&no_annotations=1"
                resp = await client.get(url)
                
                if resp.status_code == 200:
                    api_data = resp.json().get("results", [])
                    for r in api_data:
                        comps = r.get("components", {})
                        
                        # Requirement: Skip buildings
                        if comps.get("_category") == "building":
                            continue
                            
                        # Extraction and filtering
                        name = comps.get("city") or comps.get("town") or comps.get("village") or comps.get("hamlet")
                        if not name:
                            name = r.get("formatted", "").split(",")[0]
                        
                        is_railway = comps.get("railway") or comps.get("station")
                        # OpenCage doesn't always flag airport in components easily, 
                        # but we check for 'airport' in formatted or components
                        is_ap = "airport" in r.get("formatted", "").lower() or comps.get("airport")
                        
                        # Transport filtering for API results
                        if transport == "Flight" and not is_ap:
                            continue
                        elif transport in ["Train", "Bus"] and is_ap:
                            continue

                        conf_score = int(r.get("confidence") or 0) * 4
                        type_score = 0
                        if comps.get("city"): type_score = 10
                        elif comps.get("town"): type_score = 8
                        
                        total_api_score = conf_score + type_score
                        if is_railway and is_station_query: total_api_score += 40
                        if is_ap and transport == "Flight": total_api_score += 100
                        
                        results.append({
                            "name": name,
                            "type": "Airport" if is_ap else ("Railway Station" if is_railway else "City/Village"),
                            "state": comps.get("state"),
                            "district": comps.get("county") or comps.get("state_district"),
                            "score": total_api_score
                        })
        except Exception as e:
            # Safe error handling: Log and continue so local search still works
            print(f"OpenCage search error (safe fallback): {e}")

    # 4. Merge, Sort, Deduplicate
    results.sort(key=lambda x: x["score"], reverse=True)
    
    final_results = []
    seen_unique = set()
    for entry in results:
        # Deduplicate based on name and type to allow same city name as airport
        unique_key = f"{entry['name'].lower()}:{entry['type']}"
        if unique_key not in seen_unique:
            # Remove internal score before returning
            final_results.append({
                "name": entry["name"],
                "type": entry["type"],
                "state": entry.get("state"),
                "district": entry.get("district")
            })
        if len(final_results) >= 15:
            break

    # 5. Store in Cache
    SEARCH_CACHE[q] = {"data": final_results, "ts": now}
    
    return final_results

class HolidayCheck(BaseModel):
    date: str # YYYY-MM-DD

@app.post("/check-holiday")
def check_holiday_endpoint(data: HolidayCheck):
    """Endpoint for frontend to check holiday status."""
    try:
        dt = datetime.strptime(data.date, "%Y-%m-%d")
        status = get_holiday_status(dt.year, dt.month, dt.day)
        return {"date": data.date, "is_festival": status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict")
def predict_demand(input_data: ScenarioInput):
    travel_type = input_data.travel_type.strip()
    state = model_states.get(travel_type)
    
    if not state or not state.get("baseline"):
        raise HTTPException(
            status_code=503, 
            detail=f"No dataset found for {travel_type}. Please add Excel files to datasets/{travel_type}/"
        )

    # Clean inputs
    day = input_data.day.strip().title()
    weather = input_data.weather.strip().title()
    festival = input_data.festival.strip().title()
    season = input_data.season.strip().title()
    travel_type = input_data.travel_type.strip()

    # Type-safe handling: check None before calling .strip()
    destination = None
    if input_data.destination:
        destination = input_data.destination.strip().title() # type: ignore

    # Calculate Pressure
    try:
        scenario_pressure = cast(Any, fd_logic).compute_scenario_pressure( 
            state["baseline"],
            state["day_idx"],
            state["weather_idx"],
            state["fest_idx"],
            state["season_idx"],
            state["dest_idx"],
            day, weather, festival, season, destination
        )
    except Exception as e:
         raise HTTPException(status_code=400, detail=f"Invalid input: {e}")

    # Calculate Percentile
    historical_pressures = state["historical_pressures"]
    percentile = (
        np.sum(historical_pressures <= scenario_pressure)
        / len(historical_pressures)
        * 100
    )

    score = float(scenario_pressure)
    
    # --- Demand Normalization (Part 1) ---
    MAX_DEMAND_SCORE = 2.5
    demand_pct = round((score / MAX_DEMAND_SCORE) * 100)
    demand_pct = max(0, min(100, demand_pct))
    
    # Thresholds
    if score < 1.0:
        level = "COMFORTABLE"
        message = "Plenty of seats available. No need to hurry."
    elif score < 1.3:
        level = "RELAXED"
        message = "Normal crowd. Booking anytime is safe."
    elif score < 1.6:
        level = "BUSY"
        message = "Tickets are selling fast! Better book today."
    else:
        level = "VERY BUSY"
        message = "Last few seats left! Book immediately!"

    # --- Booking Intelligence Logic ---
    
    # Acceleration Rate (e.g., 1.45x)
    # Using format to avoid round() overload issues in some linters
    acceleration_rate = float(f"{max(1.0, score):.2f}")
    
    # Risk Level Classification - Simplified for everyone
    if score < 1.1:
        risk_level = "Easy to Book"
        risk_color = "#48bb78" # Green
        risk_badge = "🟢"
    elif score < 1.35:
        risk_level = "Getting Crowded"
        risk_color = "#ecc94b" # Yellow
        risk_badge = "🟡"
    elif score < 1.6:
        risk_level = "Selling Fast"
        risk_color = "#ed8936" # Orange
        risk_badge = "🟠"
    else:
        risk_level = "Almost Sold Out"
        risk_color = "#f56565" # Red
        risk_badge = "🔴"

    # Dynamic Advisory Message - Short and clear
    advisory_message = "Seats will be gone soon. Get yours now!"
    if score < 1.2:
        advisory_message = "No rush, seats are plenty for next few days."
    elif score < 1.5:
        advisory_message = "Booking in next few hours is recommended."

    # Redirect Links
    if travel_type == "Bus":
        redirect_url = "https://www.redbus.in"
        redirect_label = "Check Live Availability on RedBus"
    elif travel_type == "Flight":
        redirect_url = "https://www.makemytrip.com/flights/"
        redirect_label = "Check Live Availability on MakeMyTrip"
    else:
        redirect_url = "https://www.confirmtkt.com"
        redirect_label = "Check Live Availability on ConfirmTkt"

    # Booking Velocity Trend (past vs recent)
    # Simulated for dashboard visualization
    historical_velocity = 1.0
    recent_velocity = score

    # --- 1. Smart Insights Data ---
    # helper to get index safely
    def get_factor(idx_map, key):
        return idx_map.get(key, 1.0)

    factors = {
        "Base": 1.0, 
        "Day": get_factor(state["day_idx"], day),
        "Weather": get_factor(state["weather_idx"], weather),
        "Festival": get_factor(state["fest_idx"], festival),
        "Season": get_factor(state["season_idx"], season),
        "Destination": get_factor(state["dest_idx"], destination) if destination else 1.0
    }

    # --- 2. 5-Day Forecast Simulation ---
    forecast = []
    dataset_days: list[str] = ["Weekday", "Weekday", "Weekday", "Weekday", "Weekend", "Weekend", "Weekday"]
    
    s_idx_val = 0
    if day != "Weekday":
        s_idx_val = 4
    
    for i in range(5):
        current_idx = (s_idx_val + i) % 7 # type: ignore
        current_day_type: str = dataset_days[current_idx]
        
        future_score = cast(Any, fd_logic).compute_scenario_pressure( 
            state["baseline"],
            state["day_idx"],
            state["weather_idx"],
            state["fest_idx"],
            state["season_idx"],
            state["dest_idx"],
            current_day_type, weather, festival, season, destination
        )
        
        display_day: int = i + 1
        label = "Today" if i == 0 else f"Day {display_day}"
        forecast.append({
            "day": label,
            "score": float(future_score) / float(state["baseline"]), 
            "value": float(future_score) 
        })

    # --- Narrative Generation (AI Pulse) ---
    narrative_parts = []
    top_factor = max(cast(Any, factors), key=cast(Any, factors).get) if factors else "Base" # type: ignore
    
    if level == "LOW":
        narrative_parts.append("Travel conditions are optimal.")
    elif level == "NORMAL":
        narrative_parts.append("Typical travel patterns detected.")
    else:
        narrative_parts.append("High demand pressure detected.")

    if top_factor == "Festival" and factors["Festival"] > 1.1:
        narrative_parts.append("The primary driver is the local festival season.")
    elif top_factor == "Weather" and factors["Weather"] > 1.1:
        narrative_parts.append(f"Adverse {weather} weather at the destination is significantly impacting travel speed.")
    elif top_factor == "Day" and factors["Day"] > 1.1:
        narrative_parts.append("Weekend travel surge is the main contributor.")
    
    narrative = " ".join(narrative_parts) + f" Total demand load is at {demand_pct}% of capacity."

    return {
        "level": level,
        "color": risk_color,
        "message": advisory_message, 
        "score": float(score),
        "percentile": float(percentile), # Added for Technical Details
        "factors": factors, # Restored for Insight Card
        "intelligence": {
            "acceleration_rate": acceleration_rate,
            "demand_pct": demand_pct,
            "risk_level": risk_level,
            "risk_color": risk_color,
            "risk_badge": risk_badge,
            "advisory_message": advisory_message,
            "narrative": narrative,
            "historical_velocity": 0.45,
            "recent_velocity": 0.45 * acceleration_rate,
            "redirect_url": redirect_url, # Use the variables already defined
            "redirect_label": redirect_label
        },
        "forecast": forecast
    }


class AnalyzeRequest(BaseModel):
    location: str


@app.post("/analyze")
async def analyze_location(req: AnalyzeRequest):
    """Geocode a location name via OpenCage and fetch current weather from OpenWeather.

    Returns: {location, latitude, longitude, temperature, weather_description, humidity, wind_speed}
    """
    import httpx  # type: ignore

    loc_name = req.location.strip()
    if not loc_name:
        raise HTTPException(status_code=400, detail="Empty location provided")

    OPENCAGE_KEY = os.environ.get("OPENCAGE_API_KEY")
    OPENWEATHER_KEY = os.environ.get("OPENWEATHER_API_KEY")


    if not OPENCAGE_KEY or not OPENWEATHER_KEY:
        raise HTTPException(status_code=500, detail="Missing geocoding or weather API keys in environment")

    # Prepare queries and normalization
    def normalize_query(name: str) -> str:
        # Case-insensitive removal of common station tokens
        tokens = ["junction", "jn", "jn.", "railway station", "railwaystation", "railway", "station", "stn", "stn."]
        s = name or ""
        s_low = s.lower()
        for t in tokens:
            s_low = s_low.replace(t, "")
        # collapse whitespace
        return " ".join(s_low.split()).strip()

    queries = [loc_name, normalize_query(loc_name), f"{loc_name}, India", f"{normalize_query(loc_name)}, India"]

    # Try OpenCage with multiple candidates first
    chosen = None
    lat = lng = None
    geocode_attempted = False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for qname in queries:
                q = urllib.parse.quote_plus(qname)
                geocode_url = f"https://api.opencagedata.com/geocode/v1/json?q={q}&key={OPENCAGE_KEY}&limit=3&countrycode=in"
                geo_resp = await client.get(geocode_url)
                geo_resp.raise_for_status()
                geo_json = geo_resp.json()
                results = geo_json.get("results") or []
                geocode_attempted = True

                # score and pick best candidate
                best = None
                best_score = -1
                for r in results:
                    comps = r.get("components", {}) or {}
                    geom = r.get("geometry") or {}
                    score = 0
                    # Prefer railway/station matches
                    if comps.get("railway") or comps.get("station"):
                        score += 30
                    # Prefer localities (village/town/city)
                    if comps.get("village") or comps.get("town") or comps.get("city") or comps.get("hamlet"):
                        score += 10
                    # Confidence (OpenCage confidence is 1-10)
                    conf = r.get("confidence")
                    try:
                        score += int(conf or 0)
                    except Exception:
                        pass
                    # Exact name match bonus
                    formatted = (r.get("formatted") or "").lower()
                    if loc_name.lower() in formatted:
                        score += 5

                    if score > best_score:
                        best = r
                        best_score = score

                if best and best_score >= 5:
                    geometry = best.get("geometry") or {}
                    lat = geometry.get("lat")
                    lng = geometry.get("lng")
                    chosen = best
                    break

            # Fallback to Open-Meteo geocoding if OpenCage didn't yield a good candidate
            if not chosen:
                # use first query for meteo search
                q = urllib.parse.quote_plus(queries[0])
                meteo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={q}&count=1&language=en&format=json"
                meteo_resp = await client.get(meteo_url)
                meteo_resp.raise_for_status()
                meteo_json = meteo_resp.json()
                meteo_results = meteo_json.get("results") or []
                if meteo_results:
                    lat = meteo_results[0].get("latitude")
                    lng = meteo_results[0].get("longitude")

            if lat is None or lng is None:
                # If we attempted geocoding but found nothing, return not found
                if geocode_attempted:
                    raise HTTPException(status_code=404, detail="Location not found by geocoding services")
                else:
                    raise HTTPException(status_code=502, detail="Geocoding services unavailable")

            # Fetch current weather from OpenWeather (metric units)
            weather_url = (
                f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&units=metric&appid={OPENWEATHER_KEY}"
            )
            weather_resp = await client.get(weather_url)
            weather_resp.raise_for_status()
            weather_json = weather_resp.json()

    except httpx.HTTPStatusError as he:
        raise HTTPException(status_code=502, detail=f"Upstream service error: {he.response.status_code}")
    except httpx.RequestError as re:
        raise HTTPException(status_code=502, detail=f"Error contacting upstream service: {re}")
    except HTTPException:
        raise
    except Exception as e:
        print("FULL ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

    # Parse weather payload safely
    try:
        main = weather_json.get("main", {})
        wind = weather_json.get("wind", {})
        weather_list = weather_json.get("weather") or []
        weather_desc = weather_list[0].get("description") if weather_list else ""

        if lat is None or lng is None:
            raise HTTPException(status_code=404, detail="Could not resolve coordinates")

        response = {
            "location": loc_name,
            "latitude": float(lat), # type: ignore
            "longitude": float(lng), # type: ignore
            "temperature": main.get("temp"),
            "weather_description": weather_desc,
            "humidity": main.get("humidity"),
            "wind_speed": wind.get("speed")
        }

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse weather response: {e}")

if __name__ == "__main__":
    import uvicorn # type: ignore
    # Reload=False because we are handling reloading manually, and uvicorn reload conflicts with threads sometimes
    # But usually reload=True is for code changes. Here we want data changes.
    # We can keep reload=True for dev, but our watcher works independently.
    uvicorn.run("backend_api:app", host="0.0.0.0", port=8000, reload=True)
