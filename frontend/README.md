# SENTRIX Frontend (Mission Control)

Owned by the frontend agent. Not yet started.

Backend contract (REST + WebSocket, event/incident schemas): see
[`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md).

Backend runs at `http://127.0.0.1:8000` by default
(`cd ../backend && ./.venv/bin/uvicorn app.main:app --reload --port 8000`).

Do not synthesize incident state client-side — the backend is the source of
truth. Render `/api/incidents` and `/ws` messages directly.
