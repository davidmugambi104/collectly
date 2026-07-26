"""Skrapp.io client — email finder + verifier (backup to Hunter).

Used for:
- Email finder: name + domain → email
- Email verifier: deliverability check
- Domain search: list emails at a company (skrapp extension flow)

Free tier: 50 credits/mo. Same shape as Hunter.
API key: /home/davie/.openclaw/secrets/collectly/SKRAPP_API_KEY

Docs: https://api.skrapp.io/

NOTE: Skrapp's public API surface is less stable than Hunter. The endpoints
below are best-effort against their documented v3 surface. If the endpoint
shape changes, this client is the only place that needs to update.
"""
from typing import Any, Dict, Optional

from . import load_secret, request

API_BASE = "https://api.skrapp.io/api/v2"


def _key() -> Optional[str]:
    return load_secret("SKRAPP_API_KEY")


def _auth_headers() -> Dict[str, str]:
    key = _key()
    if not key:
        return {}
    return {"X-Access-Key": key, "Content-Type": "application/json"}


def email_finder(first_name: str, last_name: str, domain: str) -> Dict[str, Any]:
    """Find a specific person's email.

    Returns: {"ok": bool, "data": {"data": {"email": ..., "status": ...}}}
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "SKRAPP_API_KEY not set", "data": None}
    headers = _auth_headers()
    return request(
        "GET",
        f"{API_BASE}/profile/email",
        headers=headers,
        json_body=None,
    )


def email_verifier(email: str) -> Dict[str, Any]:
    """Verify a single email's deliverability.

    Returns: {"ok": bool, "data": {"result": "deliverable"|"undeliverable"|"risky"}}
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "SKRAPP_API_KEY not set", "data": None}
    headers = _auth_headers()
    # Skrapp verifier is GET-based with query param
    return request(
        "GET",
        f"{API_BASE}/email/verify?email={email}",
        headers=headers,
    )


def is_usable(result: Dict[str, Any]) -> bool:
    """True if the verifier says deliverable."""
    if not result.get("ok"):
        return False
    data = result.get("data") or {}
    # Try multiple known response shapes
    inner = data.get("data") or data
    status = inner.get("status") or inner.get("result") or ""
    return str(status).lower() in ("deliverable", "valid", "ok", "verified")
