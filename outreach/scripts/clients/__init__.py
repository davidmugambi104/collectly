"""Base HTTP client for lead-gen tool APIs.

Provides:
- Lazy API key loading from /home/davie/.openclaw/secrets/collectly/
- User-Agent header (Cloudflare blocks default Python urllib on some gateways)
- Rate-limit aware retry with exponential backoff
- JSON request/response helpers
- Result wrapper that always returns {"ok": bool, "data": ..., "error": ...}

This module is intentionally minimal — no SDK dependencies, just stdlib
(urllib + json). All tool clients (apollo, skrapp, hunter) build on this.
"""
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional, Tuple

SECRETS_DIR = f"{os.path.expanduser('~')}/.openclaw/secrets/collectly"
USER_AGENT = "collectly-outreach/1.0 (+getcollectly.app)"

# Per-host rate limits (requests per second). Conservative defaults.
# Apollo free tier: ~50 req/min → 0.8/s
# Skrapp free tier: not documented, treat as 1/s
# Hunter free tier: not strictly rate-limited, but 1/s is safe
DEFAULT_RPS = {
    "api.apollo.io": 0.8,
    "api.hunter.io": 1.0,
    "app.skrapp.io": 1.0,
    "api.skrapp.io": 1.0,
    "api.resend.com": 5.0,
}


class RateLimiter:
    """Simple per-host token bucket. thread-unsafe but we run single-threaded."""

    def __init__(self):
        self._last_call: Dict[str, float] = {}

    def wait(self, host: str):
        rps = DEFAULT_RPS.get(host, 1.0)
        min_interval = 1.0 / rps
        last = self._last_call.get(host, 0)
        elapsed = time.time() - last
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        self._last_call[host] = time.time()


_limiter = RateLimiter()


def load_secret(name: str) -> Optional[str]:
    """Load a secret from the secrets dir. Returns None if missing/empty.

    The file should contain just the key, no quotes, no trailing newline issues.
    Empty files (1 byte) are treated as missing — common placeholder pattern.
    """
    path = os.path.join(SECRETS_DIR, name)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            value = f.read().strip()
        if not value or len(value) < 4:
            return None
        return value
    except OSError:
        return None


def request(
    method: str,
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    form_body: Optional[Dict[str, str]] = None,
    timeout: int = 30,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """Make an HTTP request with rate limiting, retries, and a uniform result.

    Returns a dict shaped as:
        {"ok": bool, "status": int, "data": <parsed JSON or raw>, "error": str|None}

    Retries on:
        - 429 (rate limited; honors Retry-After if present)
        - 5xx
        - urllib URLError / timeout
    Does NOT retry on:
        - 4xx other than 429 (auth, validation, etc. — surface the error)
    """
    parsed_headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        parsed_headers.update(headers)

    body: Optional[bytes] = None
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        parsed_headers.setdefault("Content-Type", "application/json")
    elif form_body is not None:
        body = urllib.parse.urlencode(form_body).encode("utf-8")
        parsed_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")

    from urllib.parse import urlparse

    host = urlparse(url).netloc

    last_error: Optional[str] = None
    for attempt in range(max_retries + 1):
        _limiter.wait(host)
        req = urllib.request.Request(url, data=body, method=method, headers=parsed_headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                try:
                    parsed = json.loads(raw) if raw else {}
                except json.JSONDecodeError:
                    parsed = {"raw": raw}
                return {"ok": True, "status": resp.status, "data": parsed, "error": None}
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                parsed = {"raw": raw}
            last_error = f"HTTP {e.code}: {raw[:200]}"
            if e.code == 429:
                # Honor Retry-After if present
                retry_after = e.headers.get("Retry-After")
                wait = float(retry_after) if retry_after else (2 ** attempt)
                time.sleep(min(wait, 30))
                continue
            if 500 <= e.code < 600:
                time.sleep(2 ** attempt)
                continue
            return {"ok": False, "status": e.code, "data": parsed, "error": last_error}
        except (urllib.error.URLError, TimeoutError) as e:
            last_error = f"network: {e}"
            time.sleep(2 ** attempt)
            continue
        except Exception as e:  # noqa: BLE001
            last_error = f"unexpected: {e}"
            return {"ok": False, "status": 0, "data": None, "error": last_error}

    return {"ok": False, "status": 0, "data": None, "error": last_error or "max retries exceeded"}


def has_secret(name: str) -> bool:
    """Convenience: True if the secret file exists and has a real value."""
    return load_secret(name) is not None


def status() -> Dict[str, bool]:
    """Return a dict of which lead-gen tool secrets are present.

    Use this in scripts to decide what to do when a key is missing.
    """
    return {
        "hunter": has_secret("HUNTER_API_KEY"),
        "apollo": has_secret("APOLLO_API_KEY"),
        "skrapp": has_secret("SKRAPP_API_KEY"),
        "resend": has_secret("RESEND_API_KEY"),
        "trembi": has_secret("TREMBI_API_KEY"),
        "zoominfo": has_secret("ZOOMINFO_API_KEY"),
    }
