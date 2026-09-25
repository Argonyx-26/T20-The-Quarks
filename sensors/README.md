# SENTRIX Sensor Adapters

Owner: **Claude C** (sensor/integration/QA). All adapters share one
interface (`sensors/common/adapter.py`: `start / stop / poll_once / emit`)
and POST the same canonical Event to the backend's `/api/events` — see
`docs/API_CONTRACT.md`. The backend cannot tell whether an event came from
a live sensor, a fallback, or replay, and none of these adapters decide
whether an incident exists; that's the backend's deterministic fusion
engine.

## Status

| Adapter | WORKING TODAY | FALLBACK | LIMITATION |
|---|---|---|---|
| `vision_adapter.py` | Live webcam presence detection → `person_in_restricted_zone` event. Two detector tiers, auto-selected at start: OpenCV HOG people detector when available, else a dependency-free frame-difference motion detector (see note below) | `--manual` flag emits an operator-triggered event through the same path, honestly labeled `attributes.trigger=manual_operator_input` | No identity/face recognition by design. Needs OS camera permission for the terminal/process running it; requires `opencv-python`. No frame is ever stored — evidence carries detection metadata only. |
| `endpoint_adapter.py` | Real USB attach detection via macOS `system_profiler SPUSBDataType` polling (diffs the device set each poll) | Auto-degrades to watching a local folder for new files after 2 consecutive native polling failures, or immediately on non-macOS | Native path is macOS-only and `system_profiler` is slow (~1-3s/call) — poll interval is tuned accordingly, not sub-second. |
| `network_adapter.py` | Real `psutil.net_io_counters()` throughput + rolling mean/stdev baseline; emits `outbound_data_anomaly` only when the live rate exceeds a configured σ deviation from its own baseline | `--spike` / `generate_benign_spike()` produces a genuine loopback (127.0.0.1-only) traffic burst so the *real* detector has something *real* to catch on demand, for demo purposes | Baseline needs `baseline_window` polls (default 10) to warm up before it will emit anything — by design, to avoid false positives on cold start. |
| `replay_adapter.py` | Thin CLI over the backend's own `/api/demo/replay/{scenario}` route | N/A — there is no second replay implementation | Scenario files live in `backend/scenarios/` (backend-owned); this adapter only lists/triggers them. |

## Setup

```bash
cd sensors
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

`opencv-python` is the only heavy dependency (a large prebuilt wheel, no
compilation). If you don't need live vision for a given run, comment it out
of `requirements.txt` — `endpoint_adapter.py` and `network_adapter.py`
import their dependencies lazily and don't need it.

Backend URL defaults to `http://127.0.0.1:8000`; override with
`SENTRIX_BACKEND_URL`. Other tunables are in `sensors/config.py`.

**Note on opencv-python versions:** some published builds (observed:
`opencv-python==5.0.0.93`) ship without the classic `HOGDescriptor`
top-level API at all (`cv2.objdetect` doesn't exist either). `requirements.txt`
pins `opencv-python>=4.9,<5` for the best (HOG) detector tier; if you
install a version without it anyway, `vision_adapter.py` detects this at
`start()` and transparently drops to the frame-difference motion detector
instead of crashing — see the module docstring.

## CLI

```bash
python -m sensors.run vision   [--asset LAB-01] [--zone RESTRICTED-LAB] [--once] [--manual]
python -m sensors.run endpoint [--asset LAB-01] [--zone RESTRICTED-LAB] [--once]
python -m sensors.run network  [--asset LAB-01] [--zone RESTRICTED-LAB] [--once] [--spike]
python -m sensors.run replay   positive_correlation [--live] [--speed 4]
python -m sensors.run replay   --list
```

Every subcommand without `--once` runs a polling loop until Ctrl-C, and
every emitted event is printed as the exact JSON the backend returned
(`{event, duplicate, incident, incident_created}`).

## Why these specific fallbacks

The mandate for this subsystem is: **do not block the whole project on a
platform-dependent API.** Live USB device enumeration and live camera
access are both plausible to fail on an arbitrary hackathon laptop (camera
permission dialogs, no camera, sandboxed shell). Each adapter degrades to
something that still produces a real, honestly-labeled event through the
same canonical path rather than faking sensor input — see
`sensors/vision_adapter.py::emit_manual_trigger` and
`sensors/endpoint_adapter.py`'s watched-folder path.
