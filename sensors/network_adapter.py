"""NetworkAdapter -- real machine network telemetry + deterministic
rolling-baseline anomaly rule.

No attacks, no fabricated "attack detected" events. This reads real
psutil.net_io_counters() throughput on the host, maintains a rolling
mean/stdev baseline, and emits network_anomaly only when the current rate
deviates more than a configured number of standard deviations from that
baseline. The detection is plain arithmetic -- no model call decides
whether an anomaly exists.

A demo needs a way to *produce* a real deviation on demand without doing
anything resembling an actual attack. `generate_benign_spike()` opens a
genuine loopback socket and sends real bytes to itself for a short burst,
which produces a real, honestly-labeled throughput spike for the detector
to catch -- not a fabricated event.
"""
from __future__ import annotations

import socket
import statistics
import threading
import time
from collections import deque
from typing import Optional

from .common.adapter import SensorAdapter
from .common.client import BackendClient
from . import config


class NetworkAdapter(SensorAdapter):
    source = "network"

    def __init__(
        self,
        client: BackendClient,
        asset_id: str,
        zone_id: Optional[str] = None,
        baseline_window: Optional[int] = None,
        deviation_threshold_sigma: Optional[float] = None,
    ):
        super().__init__(client, asset_id, zone_id)
        self.baseline_window = baseline_window or config.NETWORK_BASELINE_WINDOW
        self.deviation_threshold_sigma = (
            deviation_threshold_sigma or config.NETWORK_DEVIATION_THRESHOLD_SIGMA
        )
        self._history: deque[float] = deque(maxlen=self.baseline_window)
        self._last_counters = None
        self._last_time: Optional[float] = None

    def start(self) -> None:
        import psutil

        self._psutil = psutil
        self._last_counters = psutil.net_io_counters()
        self._last_time = time.time()
        self._history.clear()
        self._running = True

    def stop(self) -> None:
        self._running = False

    def _current_rate_bytes_per_sec(self) -> float:
        now = time.time()
        counters = self._psutil.net_io_counters()
        dt = max(now - (self._last_time or now), 1e-3)
        prev_total = self._last_counters.bytes_sent + self._last_counters.bytes_recv
        cur_total = counters.bytes_sent + counters.bytes_recv
        rate = (cur_total - prev_total) / dt
        self._last_counters = counters
        self._last_time = now
        return max(0.0, rate)

    def poll_once(self) -> Optional[dict]:
        rate = self._current_rate_bytes_per_sec()

        if len(self._history) < self.baseline_window:
            self._history.append(rate)
            return None  # still warming up the baseline

        baseline = statistics.mean(self._history)
        stdev = statistics.pstdev(self._history) or 1.0
        deviation_sigma = (rate - baseline) / stdev
        self._history.append(rate)

        if deviation_sigma < self.deviation_threshold_sigma:
            return None

        confidence = round(min(0.9, 0.5 + deviation_sigma / 20.0), 2)
        return self.emit(
            event_type="outbound_data_anomaly",
            severity=65,
            confidence=confidence,
            attributes={
                "rate_bytes_per_sec": round(rate, 1),
                "baseline_bytes_per_sec": round(baseline, 1),
                "deviation_sigma": round(deviation_sigma, 2),
            },
            evidence={"detector": "rolling_baseline_stddev", "window": self.baseline_window},
        )

    @staticmethod
    def generate_benign_spike(duration_seconds: float = 2.0, chunk_bytes: int = 1_000_000) -> None:
        """Real loopback traffic burst to legitimately trigger the rolling
        baseline detector during a demo. Not a network attack: both ends of
        the connection are this same process, on localhost only."""

        def _server(sock: socket.socket, stop_at: float) -> None:
            sock.listen(1)
            sock.settimeout(1.0)
            try:
                conn, _ = sock.accept()
            except socket.timeout:
                return
            with conn:
                while time.time() < stop_at:
                    try:
                        if not conn.recv(65536):
                            break
                    except socket.timeout:
                        break

        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.bind(("127.0.0.1", 0))
        port = srv.getsockname()[1]
        stop_at = time.time() + duration_seconds
        t = threading.Thread(target=_server, args=(srv, stop_at), daemon=True)
        t.start()

        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.connect(("127.0.0.1", port))
        payload = b"\x00" * chunk_bytes
        try:
            while time.time() < stop_at:
                client.sendall(payload)
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass  # server side closed at stop_at -- burst is over, not an error
        finally:
            client.close()
            srv.close()
            t.join(timeout=2.0)
