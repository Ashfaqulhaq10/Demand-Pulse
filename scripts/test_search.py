import requests

def test_search():
    base_url = "http://localhost:8000"
    # Wait for backend to reload if it's auto-reloading
    import time
    time.sleep(2)
    
    queries = ["Ahmedabad", "Sippighat", "Mumbai"]
    for q in queries:
        try:
            r = requests.get(f"{base_url}/search-locations?q={q}")
            if r.status_code == 200:
                results = r.json()
                print(f"Query: {q} -> Found {len(results)} results")
                if results:
                    print(f"First result: {results[0]['name']} ({results[0]['type']})")
            else:
                print(f"Query: {q} -> Failed with {r.status_code}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_search()
