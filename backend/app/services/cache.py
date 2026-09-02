"""
RiskSentinel AI v2.0 -- TTL In-Memory Cache
=============================================
Uses cachetools.TTLCache for sub-millisecond cache hits.
Cache key is a hash of the feature vector (not transaction_id).
"""
import hashlib
import json
from cachetools import TTLCache


class RiskCache:
    """In-memory TTL cache for risk scoring results."""

    def __init__(self, maxsize: int = 10_000, ttl: int = 300):
        self._cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._hits = 0
        self._misses = 0

    def _make_key(self, features: dict) -> str:
        """Hash the scoring-relevant features (excludes transaction_id)."""
        feature_str = json.dumps(features, sort_keys=True, default=str)
        return hashlib.md5(feature_str.encode()).hexdigest()

    def get(self, features: dict) -> dict | None:
        key = self._make_key(features)
        result = self._cache.get(key)
        if result is not None:
            self._hits += 1
        else:
            self._misses += 1
        return result

    def set(self, features: dict, result: dict) -> None:
        key = self._make_key(features)
        self._cache[key] = result

    @property
    def stats(self) -> dict:
        total = self._hits + self._misses
        return {
            "size": len(self._cache),
            "maxsize": self._cache.maxsize,
            "ttl": int(self._cache.ttl),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total, 4) if total > 0 else 0.0,
        }
