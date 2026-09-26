"""
Application-security building blocks for the SENTRIX backend.

Everything here is deliberately plain and dependency-free (no new package
beyond what's already in requirements.txt) -- this is a hackathon backend,
not a platform, so "lightweight middleware we can read in one sitting"
beats pulling in a rate-limiting framework for four routes.

Covers: request body size limiting, security response headers, a per-IP
sliding-window rate limiter for mutation routes, and WebSocket origin
checking. CORS itself is configured directly on the app in main.py using
`config.ALLOWED_ORIGINS`.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Callable

from fastapi import HTTPException, Request
from starlette.types import ASGIApp, Receive, Scope, Send

from . import config

# Paths that legitimately need a looser Content-Security-Policy (FastAPI's
# built-in Swagger/Redoc UI loads its JS/CSS from a CDN). Every other
# response is pure JSON and gets the strict policy.
_DOCS_PATHS = {"/docs", "/redoc", "/openapi.json"}


# ---------------------------------------------------------------------------
# Request body size limit
# ---------------------------------------------------------------------------

class BodySizeLimitMiddleware:
    """Rejects requests whose body exceeds `max_bytes`.

    Checks Content-Length up front when present (cheap, catches the common
    case immediately), and also counts bytes as the body actually streams
    in -- a client can lie about or omit Content-Length, so the streaming
    check is the real guarantee.
    """

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        content_length = headers.get(b"content-length")
        if content_length is not None:
            try:
                if int(content_length) > self.max_bytes:
                    await _send_413(send)
                    return
            except ValueError:
                pass  # malformed header -- let downstream JSON parsing reject it

        seen = 0

        async def limited_receive() -> dict:
            nonlocal seen
            message = await receive()
            if message["type"] == "http.request":
                seen += len(message.get("body", b""))
                if seen > self.max_bytes:
                    raise _BodyTooLarge()
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            await _send_413(send)


class _BodyTooLarge(Exception):
    pass


async def _send_413(send: Send) -> None:
    body = b'{"detail":{"error":"payload_too_large","detail":"request body exceeds size limit"}}'
    await send({
        "type": "http.response.start",
        "status": 413,
        "headers": [(b"content-type", b"application/json")],
    })
    await send({"type": "http.response.body", "body": body})


# ---------------------------------------------------------------------------
# Security response headers
# ---------------------------------------------------------------------------

class SecurityHeadersMiddleware:
    """Adds baseline hardening headers to every response.

    This backend only ever serves JSON, except for FastAPI's own optional
    docs UI -- so a strict `Content-Security-Policy` is safe everywhere
    except those doc paths. The frontend (a separate app, on its own
    origin) owns CSP for the pages *it* renders; this only covers what
    this process itself serves.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        async def send_with_headers(message: dict) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"referrer-policy", b"no-referrer"))
                headers.append((b"x-frame-options", b"DENY"))
                headers.append((b"permissions-policy", b"camera=(), microphone=(), geolocation=()"))
                if path not in _DOCS_PATHS:
                    headers.append((b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

class RateLimiter:
    """Simple per-key sliding-window counter, in-process (fine for a
    single-worker hackathon deployment; not shared across processes)."""

    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, *, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        hits = self._hits[key]
        cutoff = now - self.window_seconds
        while hits and hits[0] < cutoff:
            hits.popleft()
        if len(hits) >= self.max_requests:
            return False
        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


mutation_rate_limiter = RateLimiter(config.RATE_LIMIT_MAX_REQUESTS, config.RATE_LIMIT_WINDOW_SECONDS)


def _client_key(request: Request) -> str:
    client = request.client
    return client.host if client else "unknown"


def rate_limit(request: Request) -> None:
    """FastAPI dependency: `Depends(rate_limit)` on any mutation route."""
    if not mutation_rate_limiter.allow(_client_key(request)):
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limited", "detail": "too many requests, slow down"},
        )


# ---------------------------------------------------------------------------
# WebSocket origin check
# ---------------------------------------------------------------------------

def websocket_origin_allowed(origin: str | None) -> bool:
    """Browsers always send `Origin` on WebSocket handshakes; non-browser
    clients (sensor scripts, test tooling, curl-equivalents) generally
    don't. We reject a *present* Origin that isn't allow-listed -- that's
    the case a malicious web page embedding our socket would hit -- but
    don't require the header, since legitimate non-browser tooling has no
    Origin to send and Origin spoofing isn't a browser-enforced concept
    outside an actual browser anyway.
    """
    if origin is None:
        return True
    return origin in config.ALLOWED_ORIGINS
