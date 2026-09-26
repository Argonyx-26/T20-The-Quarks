<div align="center">
  
# 🛡️ SENTRIX
**Intelligent Threat Detection & Situational Awareness System**

[![Status: Active](https://img.shields.io/badge/Status-Active-success.svg)](#) 
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React + Vite](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61dafb.svg)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-00a393.svg)](https://fastapi.tiangolo.com/)

*Built for **Argonyx '26** by **Team The Quarks**.*

**Security systems see events. SENTRIX sees relationships.**

---

</div>

## 📖 Overview

SENTRIX is a next-generation situational awareness platform that ingests streams of telemetry from multiple disparate sensors and uses deterministic fusion logic to identify true security incidents. While traditional systems overwhelm operators with thousands of disconnected alerts, SENTRIX contextualizes time, asset, zone, confidence, and source diversity to build a coherent narrative of physical and digital security threats.

```mermaid
graph TD
    V[Vision Sensor] -->|Standardized Event| E(Event Stream)
    EP[Endpoint Sensor] -->|Standardized Event| E
    N[Network Sensor] -->|Standardized Event| E
    
    E -->|Contextual Fusion| F{Deterministic Engine}
    F -->|Time + Asset + Zone + Confidence| I[Incident Object]
    I -->|WebSocket| M((Real-Time Mission Control))
    I -->|Encrypted Alert| P📱[Paired Mobile Device]
```

> **Note on AI Usage:** LLMs, if used anywhere in this project, only **explain** already-created incidents (e.g., SITREP text, summaries). They never decide whether an incident exists — that is strictly handled by our deterministic fusion logic.

## ✨ Key Features

- **🧠 Deterministic Fusion Engine:** Correlates disparate signals (vision, endpoint, network) into verified incidents, reducing false positives and alert fatigue.
- **⚡ Real-Time Mission Control:** A high-performance React frontend providing a live operations center view using WebSockets.
- **📱 Secure Device Pairing:** Securely pair mobile devices via QR code to receive mission-critical alerts out-of-band.
- **🔌 Extensible Sensor Adapters:** Pluggable architecture allowing new sensor types to be added with minimal configuration.
- **🛡️ Rock-Solid Backend:** FastAPI backend featuring rate-limiting, CORS protection, payload size limits, and security headers.

## 🏗️ Subsystem Ownership

| Component | Owner | Technology Stack | Status |
|---|---|---|---|
| 🧮 **`backend/`** | Fusion Architect | Python, FastAPI, WebSockets | 🟢 Implemented |
| 💻 **`frontend/`** | Mission Control UI | React, Vite, TailwindCSS | 🟢 Implemented |
| 📡 **`sensors/`** | Adapters (Vision, Endpoint, Network) | Python, IOKit (macOS) | 🟢 Implemented |

---

## 🚀 Quickstart

### 1. Start the Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Or .venv/Scripts/activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*Health check:* `curl localhost:8000/api/health`

### 2. Start Mission Control (Frontend)
```bash
cd frontend
npm install
npm run dev
```
*Access the UI at:* `http://localhost:5173`

### 3. Run Sensor Adapters
```bash
cd sensors
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run one-off checks against a running backend
python -m sensors.run network --once
python -m sensors.run endpoint --once
python -m sensors.run vision --once   # requires camera permission
```

---

## 🧪 Testing & Demos

### Operator Scripts (Run from repo root)
We provide helpful scripts to manage the system lifecycle effortlessly:
```bash
./scripts/start.sh    # Start backend (+ frontend if present)
./scripts/health.sh   # Check [OK]/[DEGRADED] status for all subsystems
./scripts/demo.sh     # Run automated scenario: reset -> positive (incident) -> negative (no incident)
./scripts/reset.sh    # Clear all in-memory state
./scripts/stop.sh     # Stop services started by start.sh
```

### Manual Demo Pipeline
Run the demo pipeline without any real sensors attached:
```bash
# 1. Reset state
curl -X POST localhost:8000/api/demo/reset

# 2. Trigger positive correlation scenario
curl -X POST "localhost:8000/api/demo/replay/positive_correlation?live=true"

# 3. Verify incident creation
curl localhost:8000/api/incidents
```

### Integration / E2E Tests
Our test suite hits a real running backend, ensuring reliable behavior across the entire stack:
```bash
cd backend
../.venv/bin/pytest ../tests/ -v
```

---

## 📚 Documentation

For a deep dive into the architecture, API, and sensor integration, please review our comprehensive documentation:

- 📄 **[API Contract & Fusion Rules](docs/API_CONTRACT.md)** - Full API/WebSocket contract and event schema.
- 📡 **[Sensor Adapters](sensors/README.md)** - Details on live vs fallback adapters.

---

<div align="center">
  <p>Built with 🩵 by <b>Team The Quarks</b></p>
</div>
