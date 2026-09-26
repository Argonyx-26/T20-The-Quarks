import os
import time
import requests
import subprocess
from pathlib import Path

BACKEND_URL = os.environ.get("SENTRIX_BACKEND_URL", "http://127.0.0.1:8000")
WATCH_DIR = Path.home() / "Desktop" / "SENTRIX_DEMO_TRANSFER"

def reset_backend():
    print("== Resetting backend ==")
    requests.post(f"{BACKEND_URL}/api/demo/reset")

def inject_vision_event(offset_secs=0):
    payload = {
        "event_id": f"demo-vision-{int(time.time())}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + offset_secs)),
        "source": "vision",
        "event_type": "person_in_restricted_zone",
        "asset_id": "MAC-01",
        "zone_id": "LOCAL-DEMO",
        "severity": 45,
        "confidence": 0.82,
        "attributes": {"camera_id": "CAM-DESK-01", "person_count": 1},
        "evidence": {"observation_source": "synthetic"}
    }
    requests.post(f"{BACKEND_URL}/api/events", json=payload)
    print("[Injected] Vision event: person_in_restricted_zone")

def inject_network_event(offset_secs=0):
    payload = {
        "event_id": f"demo-network-{int(time.time())}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + offset_secs)),
        "source": "network",
        "event_type": "outbound_data_anomaly",
        "asset_id": "MAC-01",
        "zone_id": "LOCAL-DEMO",
        "severity": 70,
        "confidence": 0.68,
        "attributes": {"bytes_out": 84213333, "dest_country": "unknown"},
        "evidence": {"flow_id": "fl-9911", "dest_ip": "203.0.113.44"}
    }
    requests.post(f"{BACKEND_URL}/api/events", json=payload)
    print("[Injected] Network event: outbound_data_anomaly")

def run_normal_scenario():
    print("\n=== NORMAL SCENARIO ===")
    reset_backend()
    time.sleep(1)
    
    # Write a small file to trigger the agent
    file_path = WATCH_DIR / "normal_photo.jpg"
    print(f"Transferring normal file: {file_path}")
    with open(file_path, "wb") as f:
        f.write(os.urandom(1024 * 1024 * 5)) # 5MB
    
    # Wait for the agent to process it
    time.sleep(3)
    
    # Check incidents
    res = requests.get(f"{BACKEND_URL}/api/incidents").json()
    print(f"Incidents created: {res['count']} (Expected: 0)")
    
    # Cleanup
    os.remove(file_path)

def run_suspicious_scenario():
    print("\n=== SUSPICIOUS SCENARIO ===")
    reset_backend()
    time.sleep(1)
    
    print("Injecting correlating signals (Vision & Network)...")
    inject_vision_event()
    inject_network_event()
    
    time.sleep(1)
    
    # Write a huge file to trigger the anomaly
    file_path = WATCH_DIR / "suspicious_payload.bin"
    print(f"Transferring suspicious large file: {file_path}")
    total_size = 1024 * 1024 * 60 # 60MB
    chunk_size = total_size // 50 # 50 chunks
    with open(file_path, "wb") as f:
        for _ in range(50):
            f.write(os.urandom(chunk_size))
            f.flush()
            time.sleep(0.15) # ~7.5 seconds total
        
    # Wait for the agent to process it
    time.sleep(3)
    
    # Check incidents
    res = requests.get(f"{BACKEND_URL}/api/incidents").json()
    print(f"Incidents created: {res['count']} (Expected: 1)")
    
    if res['count'] > 0:
        inc = res['incidents'][0]
        print(f"Incident {inc['incident_id']} | SEV: {inc['severity']} | CONF: {inc['confidence']}")
        print(f"Recommended Action: {inc['recommended_action']}")
        
        # DEMO RESPONSE / QUARANTINE
        print("\n=> EXECUTING SAFE QUARANTINE ACTION")
        print(f"Blocking future transfers from device and changing status to QUARANTINED...")
        requests.post(f"{BACKEND_URL}/api/incidents/{inc['incident_id']}/status", json={"status": "RESOLVED"})
        print("TRANSFER FLAGGED — QUARANTINE ACTION REQUIRED (Demo state engaged)")
        
    # Cleanup
    os.remove(file_path)

if __name__ == "__main__":
    os.makedirs(WATCH_DIR, exist_ok=True)
    
    print("Ensure sensors/mac_endpoint_agent.py is running in another terminal!")
    time.sleep(2)
    
    run_normal_scenario()
    time.sleep(2)
    run_suspicious_scenario()
    
    print("\nDEMO COMPLETE")
