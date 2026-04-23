"""
Simple in-memory TTL cache for CiteLens API responses.

Caches analyze-paper results keyed by (query, limit) to avoid redundant
upstream API calls for repeated lookups within the TTL window.

Thread-safe via asyncio.Lock for concurrent requests.
"""

import asyncio
import hashlib
import logging
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Cache settings
_DEFAULT_TTL_SECONDS = 300  # 5 minutes
_MAX_ENTRIES = 256  # LRU eviction when exceeded


class TTLCache:
    """
    Async-safe in-memory TTL cache with LRU eviction.

    Keys are arbitrary strings; values are arbitrary dicts.
    Expired entries are lazily evicted on access.
    """

    def __init__(self, ttl: int = _DEFAULT_TTL_SECONDS, max_entries: int = _MAX_ENTRIES):
        self._ttl = ttl
        self._max = max_entries
        self._store: dict[str, tuple[float, Any]] = {}  # key → (expires_at, value)
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                logger.debug("Cache miss (expired): %s", key[:40])
                return None
            logger.debug("Cache hit: %s", key[:40])
            return value

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            # Evict oldest entries if over capacity
            if len(self._store) >= self._max:
                oldest_key = min(self._store, key=lambda k: self._store[k][0])
                del self._store[oldest_key]
                logger.debug("Cache evicted oldest entry")
            self._store[key] = (time.monotonic() + self._ttl, value)
            logger.debug("Cache stored: %s", key[:40])

    async def invalidate(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def clear(self) -> None:
        async with self._lock:
            self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)


def make_cache_key(query: str, limit: int) -> str:
    """Derive a deterministic cache key from query + limit."""
    raw = f"{query.strip().lower()}:{limit}"
    return hashlib.sha256(raw.encode()).hexdigest()


# Module-level singleton — shared across all requests
response_cache = TTLCache(ttl=_DEFAULT_TTL_SECONDS, max_entries=_MAX_ENTRIES)
