import os
import time
import requests
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

def inject_background_noise():
    # Inject heartbeat/normal events for a few other assets so the Network Field looks populated
    assets = [
        {"id": "WIN-02", "zone": "OFFICE-VLAN", "source": "endpoint", "type": "agent_heartbeat"},
        {"id": "SERVER-DB1", "zone": "PROD-VLAN", "source": "network", "type": "tls_handshake"},
        {"id": "CAM-FRONT-01", "zone": "IOT-VLAN", "source": "vision", "type": "motion_detected"},
        {"id": "MAC-02", "zone": "OFFICE-VLAN", "source": "endpoint", "type": "agent_heartbeat"},
        {"id": "ROUTER-MAIN", "zone": "CORE-VLAN", "source": "network", "type": "bgp_update"}
    ]
    for i, a in enumerate(assets):
        payload = {
            "event_id": f"demo-bg-{int(time.time())}-{i}",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 300 + i*10)),
            "source": a["source"],
            "event_type": a["type"],
            "asset_id": a["id"],
            "zone_id": a["zone"],
            "severity": 10,
            "confidence": 0.99,
            "attributes": {"status": "normal"},
            "evidence": {"observation_source": "synthetic"}
        }
        requests.post(f"{BACKEND_URL}/api/events", json=payload)

if __name__ == "__main__":
    os.makedirs(WATCH_DIR, exist_ok=True)
    reset_backend()
    inject_background_noise()
    print("Waiting 20 seconds for you to place the phone down...")
    time.sleep(20)
    
    print("\n=== TRIGGERING SUSPICIOUS SCENARIO ===")
    inject_vision_event()
    inject_network_event()
    
    time.sleep(1)
    
    file_path = WATCH_DIR / "suspicious_payload.bin"
    total_size = 1024 * 1024 * 60 # 60MB
    chunk_size = total_size // 50 # 50 chunks
    with open(file_path, "wb") as f:
        for _ in range(50):
            f.write(os.urandom(chunk_size))
            f.flush()
            time.sleep(0.15) # ~7.5 seconds total
        
    time.sleep(3)
    
    res = requests.get(f"{BACKEND_URL}/api/incidents").json()
    if res['count'] > 0:
        inc = res['incidents'][0]
        requests.post(f"{BACKEND_URL}/api/incidents/{inc['incident_id']}/status", json={"status": "RESOLVED"})
        print("TRANSFER FLAGGED — QUARANTINE ACTION REQUIRED (Demo state engaged)")
        
    try:
        os.remove(file_path)
    except FileNotFoundError:
        print("Transfer intercepted and payload deleted! SUCCESS!")
    print("DONE!")
