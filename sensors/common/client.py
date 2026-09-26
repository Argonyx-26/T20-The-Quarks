"""Thin HTTP client to the SENTRIX backend.

Every adapter goes through this one class to reach the backend. There is no
adapter-specific ingestion path -- vision/endpoint/network/replay all POST
the same canonical Event shape to the same /api/events route.
"""
from __future__ import annotations

from typing import Any, Optional

import requests

from .. import config


class BackendUnreachable(Exception):
    pass


class EventRejected(Exception):
    def __init__(self, status_code: int, body: Any):
        self.status_code = status_code
        self.body = body
        super().__init__(f"backend rejected event ({status_code}): {body}")


class BackendClient:
    def __init__(self, base_url: str | None = None, timeout: float | None = None):
        self.base_url = (base_url or config.BACKEND_URL).rstrip("/")
        self.timeout = timeout or config.HTTP_TIMEOUT_SECONDS

    def post_event(self, event: dict) -> dict:
        try:
            resp = requests.post(f"{self.base_url}/api/events", json=event, timeout=self.timeout)
        except requests.RequestException as exc:
            raise BackendUnreachable(str(exc)) from exc

        if resp.status_code == 422:
            raise EventRejected(resp.status_code, resp.json())
        resp.raise_for_status()
        return resp.json()

    def health(self) -> dict:
        try:
            resp = requests.get(f"{self.base_url}/api/health", timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            raise BackendUnreachable(str(exc)) from exc

    def get_config(self) -> dict:
        try:
            resp = requests.get(f"{self.base_url}/api/config", timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            raise BackendUnreachable(str(exc)) from exc

    def reset(self) -> dict:
        try:
            resp = requests.post(f"{self.base_url}/api/demo/reset", timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            raise BackendUnreachable(str(exc)) from exc

    def list_scenarios(self) -> list[str]:
        try:
            resp = requests.get(f"{self.base_url}/api/demo/scenarios", timeout=self.timeout)
            resp.raise_for_status()
            return resp.json().get("scenarios", [])
        except requests.RequestException as exc:
            raise BackendUnreachable(str(exc)) from exc

    def replay(self, scenario_name: str, live: bool = True, speed: float = 1.0) -> dict:
        try:
            resp = requests.post(
                f"{self.base_url}/api/demo/replay/{scenario_name}",
                params={"live": str(live).lower(), "speed": speed},
                timeout=max(self.timeout, 30.0),
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            raise BackendUnreachable(str(exc)) from exc

    def list_incidents(self, status: Optional[str] = None) -> dict:
        params = {"status": status} if status else {}
        resp = requests.get(f"{self.base_url}/api/incidents", params=params, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def list_devices(self) -> dict:
        try:
            resp = requests.get(f"{self.base_url}/api/devices", timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            raise BackendUnreachable(str(exc)) from exc

    def observe_device(self, observation: dict) -> dict:
        try:
            resp = requests.post(f"{self.base_url}/api/devices/observe", json=observation, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            raise BackendUnreachable(str(exc)) from exc
