"""
Simple per-IP rate limiter using a sliding window algorithm.

Designed for a single-server deployment. In multi-instance deployments,
replace the in-memory dict with a Redis backend.
"""

import asyncio
import time
import logging
from collections import deque
from typing import Deque

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.config import settings

logger = logging.getLogger(__name__)

# Rate limit settings
_WINDOW_SECONDS = 60        # 1-minute sliding window
_MAX_REQUESTS = 30          # max requests per window per IP
_CLEANUP_INTERVAL = 120     # seconds between expired-entry cleanup


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter middleware.

    Applies only to /api/* routes. Static assets and health checks
    are always allowed through.

    Returns HTTP 429 with a Retry-After header when the limit is exceeded.
    """

    def __init__(self, app, window: int = _WINDOW_SECONDS, max_req: int = _MAX_REQUESTS):
        super().__init__(app)
        self._window = window
        self._max = max_req
        self._store: dict[str, Deque[float]] = {}
        self._lock = asyncio.Lock()
        self._last_cleanup = time.monotonic()

    def _client_ip(self, request: Request) -> str:
        """
        Extract the real client IP.

        X-Forwarded-For is only trusted when the direct socket IP
        (request.client.host) is in settings.TRUSTED_PROXY_IPS.
        This prevents clients from spoofing X-Forwarded-For: 1.2.3.4
        to bypass rate limiting on deployments that don't sit behind
        a known reverse proxy.
        """
        direct_ip = request.client.host if request.client else "unknown"

        # Build the trusted-proxy set once per request (cheap; set is small)
        trusted = {
            ip.strip()
            for ip in settings.TRUSTED_PROXY_IPS.split(",")
            if ip.strip()
        }

        if trusted and direct_ip in trusted:
            # We're behind a trusted proxy — the leftmost XFF value is the client
            forwarded = request.headers.get("x-forwarded-for", "")
            if forwarded:
                return forwarded.split(",")[0].strip()

        # No trusted proxy configured, or direct connection — use socket IP
        return direct_ip

    async def _cleanup(self) -> None:
        """Remove IPs with empty or fully-expired windows (background maintenance)."""
        now = time.monotonic()
        if now - self._last_cleanup < _CLEANUP_INTERVAL:
            return
        self._last_cleanup = now
        async with self._lock:
            expired = [
                ip for ip, timestamps in self._store.items()
                if not timestamps or now - timestamps[-1] > self._window
            ]
            for ip in expired:
                del self._store[ip]
            if expired:
                logger.debug("Rate limiter cleaned up %d expired entries", len(expired))

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Only rate-limit API endpoints
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        await self._cleanup()
        ip = self._client_ip(request)
        now = time.monotonic()

        async with self._lock:
            if ip not in self._store:
                self._store[ip] = deque()

            timestamps = self._store[ip]
            # Evict timestamps outside the sliding window
            while timestamps and now - timestamps[0] > self._window:
                timestamps.popleft()

            count = len(timestamps)
            if count >= self._max:
                oldest = timestamps[0] if timestamps else now
                retry_after = int(self._window - (now - oldest)) + 1
                logger.warning(
                    "Rate limit exceeded for %s (%d requests in %ds window)",
                    ip, count, self._window,
                )
                return Response(
                    content='{"detail":"Too many requests. Please slow down."}',
                    status_code=429,
                    media_type="application/json",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(self._max),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                    },
                )

            timestamps.append(now)
            remaining = self._max - len(timestamps)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self._max)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(self._window)
        return response
