import os
import sys
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sensors.common.client import BackendClient

WATCH_DIR = str(Path.home() / "Desktop" / "SENTRIX_DEMO_TRANSFER")


def lookup_active_usb_device(client: BackendClient):
    """Honest cross-reference to the real USB detector's registry
    (sensors/usb_device_detector.py), NOT a fallback identity guess. Only
    returns a device when exactly one USB-transport device is currently
    online/degraded -- with zero or multiple candidates, the caller keeps
    asset_id=MAC-01 and attaches no device attribution rather than
    arbitrarily picking one."""
    try:
        devices = client.list_devices().get("devices", [])
    except Exception:
        return None
    usb_devices = [d for d in devices if d.get("transport") == "usb" and d.get("status") in ("ONLINE", "DEGRADED")]
    if len(usb_devices) != 1:
        return None
    d = usb_devices[0]
    return {"device_id": d["device_id"], "display_name": d["display_name"]}

class TransferHandler(FileSystemEventHandler):
    def __init__(self, client: BackendClient):
        super().__init__()
        self.client = client
        self.active_transfers = {}
        self.last_sizes = {}
    
    def on_created(self, event):
        if event.is_directory:
            return
        # Start tracking
        path = event.src_path
        self.active_transfers[path] = time.time()
        self.last_sizes[path] = -1
        print(f"[MacEndpointAgent] Transfer started: {path}")

    def on_modified(self, event):
        if event.is_directory:
            return
        path = event.src_path
        if path in self.active_transfers:
            try:
                size = os.path.getsize(path)
                if size == self.last_sizes.get(path):
                    # Transfer complete (size hasn't changed since last tick)
                    self._finalize_transfer(path, size)
                else:
                    self.last_sizes[path] = size
            except FileNotFoundError:
                pass
                
    def _send_progress(self, path, current_size):
        start_time = self.active_transfers.get(path, time.time())
        duration = time.time() - start_time
        filename = os.path.basename(path)
        is_suspicious = current_size > 50000000

        # Determine total_bytes based on known demo files
        total_bytes = 60000000 if "suspicious" in filename else 4800000

        import uuid
        from datetime import datetime, timezone

        transfer_id = f"transfer-{filename}-{start_time}"
        attributes = {
            "transfer_id": transfer_id,
            "file_size": current_size,
            "total_bytes": total_bytes,
            "transfer_direction": "INBOUND",
            "transfer_duration": duration,
            "filename": filename,
            "status": "IN_PROGRESS",
        }
        usb_device = lookup_active_usb_device(self.client)
        if usb_device:
            attributes["usb_device_id"] = usb_device["device_id"]
            attributes["usb_device_name"] = usb_device["display_name"]

        try:
            self.client.post_event({
                "event_id": f"demo-endpoint-prog-{uuid.uuid4().hex[:8]}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "endpoint",
                "event_type": "file_transfer_progress",
                "asset_id": "MAC-01",
                "zone_id": "LOCAL-DEMO",
                "severity": 60 if is_suspicious else 20,
                "confidence": 0.8,
                "attributes": attributes,
                "evidence": {
                    "observation_source": "mac_endpoint_agent",
                    "watch_dir": WATCH_DIR
                }
            })
        except Exception as e:
            pass
                
    def _finalize_transfer(self, path, final_size):
        start_time = self.active_transfers.pop(path)
        self.last_sizes.pop(path, None)
        duration = time.time() - start_time
        
        filename = os.path.basename(path)
        is_suspicious = final_size > 50000000  # 50MB
        event_type = "file_transfer_anomaly" if is_suspicious else "file_transfer_normal"

        total_bytes = 60000000 if "suspicious" in filename else 4800000
        transfer_id = f"transfer-{filename}-{start_time}"

        print(f"[MacEndpointAgent] Transfer complete: {filename} ({final_size} bytes, {duration:.1f}s)")

        import uuid
        from datetime import datetime, timezone
        attributes = {
            "transfer_id": transfer_id,
            "file_size": final_size,
            "total_bytes": total_bytes,
            "transfer_direction": "INBOUND",
            "transfer_duration": duration,
            "filename": filename,
            "status": "COMPLETED",
        }
        usb_device = lookup_active_usb_device(self.client)
        if usb_device:
            attributes["usb_device_id"] = usb_device["device_id"]
            attributes["usb_device_name"] = usb_device["display_name"]
        try:
            self.client.post_event({
                "event_id": f"demo-endpoint-{uuid.uuid4().hex[:8]}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "endpoint",
                "event_type": event_type,
                "asset_id": "MAC-01",
                "zone_id": "LOCAL-DEMO",
                "severity": 60,
                "confidence": 0.8,
                "attributes": attributes,
                "evidence": {
                    "observation_source": "mac_endpoint_agent",
                    "watch_dir": WATCH_DIR
                }
            })
        except Exception as e:
            print(f"[MacEndpointAgent] Error emitting event: {e}")

def main():
    os.makedirs(WATCH_DIR, exist_ok=True)
    client = BackendClient(base_url="http://127.0.0.1:8000")
    
    # Send a health ping just in case
    import uuid
    from datetime import datetime, timezone
    client.post_event({
        "event_id": f"demo-startup-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "endpoint", 
        "event_type": "agent_startup", 
        "asset_id": "MAC-01", 
        "severity": 0, 
        "confidence": 1.0,
        "attributes": {},
        "evidence": {}
    })
    
    handler = TransferHandler(client)
    observer = Observer()
    observer.schedule(handler, WATCH_DIR, recursive=False)
    observer.start()
    
    print(f"[MacEndpointAgent] Listening on {WATCH_DIR} for OpenMTP transfers...")
    try:
        while True:
            time.sleep(1)
            # Check for completed transfers (files that haven't grown in 2 seconds)
            current_time = time.time()
            for path in list(handler.active_transfers.keys()):
                try:
                    size = os.path.getsize(path)
                    last_size = handler.last_sizes.get(path, -1)
                    if size == last_size:
                        handler._finalize_transfer(path, size)
                    else:
                        handler.last_sizes[path] = size
                        handler._send_progress(path, size)
                        
                        # ACTIVE INTERCEPTION: Cancel if suspicious
                        if size > 50000000:
                            print(f"[MacEndpointAgent] ACTIVE INTERCEPTION: Blocking suspicious transfer {path}")
                            
                            start_time = handler.active_transfers.get(path, time.time())
                            filename = os.path.basename(path)
                            transfer_id = f"transfer-{filename}-{start_time}"
                            
                            try:
                                # 1. Kill OpenMTP to sever the connection
                                os.system("pkill -9 -i openmtp")
                                # 2. Delete the payload
                                os.remove(path)
                            except Exception as e:
                                print(f"[MacEndpointAgent] Error during interception: {e}")
                            
                            # Remove from tracking
                            handler.active_transfers.pop(path, None)
                            
                            # Emit cancellation event
                            import uuid
                            from datetime import datetime, timezone
                            client.post_event({
                                "event_id": f"demo-endpoint-block-{uuid.uuid4().hex[:8]}",
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                                "source": "endpoint",
                                "event_type": "file_transfer_anomaly",
                                "asset_id": "MAC-01",
                                "zone_id": "LOCAL-DEMO",
                                "severity": 90,
                                "confidence": 1.0,
                                "attributes": {
                                    "transfer_id": transfer_id,
                                    "file_size": size,
                                    "total_bytes": 60000000,
                                    "transfer_direction": "INBOUND",
                                    "transfer_duration": time.time() - current_time,
                                    "filename": filename,
                                    "status": "FAILED",
                                    "reason": "Active interception triggered"
                                },
                                "evidence": {
                                    "observation_source": "mac_endpoint_agent",
                                    "watch_dir": WATCH_DIR
                                }
                            })
                except FileNotFoundError:
                    handler.active_transfers.pop(path, None)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
