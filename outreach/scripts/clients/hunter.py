"""Hunter.io client — email finder + verifier.

Used for:
- Domain search: list all emails at a company
- Email finder: name + domain → email
- Email verifier: deliverability check

Free tier: 50 credits/mo. Searches and verifications both cost 1 credit.
API key: /home/davie/.openclaw/secrets/collectly/HUNTER_API_KEY

Docs: https://hunter.io/api-documentation/v2
"""
from typing import Any, Dict, List, Optional

from . import load_secret, request

API_BASE = "https://api.hunter.io/v2"


def _key() -> Optional[str]:
    return load_secret("HUNTER_API_KEY")


def domain_search(domain: str, limit: int = 10) -> Dict[str, Any]:
    """List emails associated with a domain. 1 credit per result returned.

    Returns: {"ok": bool, "data": {"data": {"domain": ..., "emails": [...]}}}
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "HUNTER_API_KEY not set", "data": None}
    return request(
        "GET",
        f"{API_BASE}/domain-search?domain={domain}&limit={limit}&api_key={key}",
    )


def email_finder(domain: str, first_name: str, last_name: str) -> Dict[str, Any]:
    """Find a specific person's email. 1 credit if found, free if not.

    Returns: {"ok": bool, "data": {"data": {"email": ..., "score": ..., "position": ...}}}
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "HUNTER_API_KEY not set", "data": None}
    return request(
        "GET",
        f"{API_BASE}/email-finder?domain={domain}&first_name={first_name}&last_name={last_name}&api_key={key}",
    )


def email_verifier(email: str) -> Dict[str, Any]:
    """Verify deliverability. Free, no credit cost (per Hunter docs).

    Returns: {"ok": bool, "data": {"data": {"status": "valid"|"invalid"|"accept_all"|"unknown", "score": int}}}
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "HUNTER_API_KEY not set", "data": None}
    return request(
        "GET",
        f"{API_BASE}/email-verifier?email={email}&api_key={key}",
    )


def is_usable(result: Dict[str, Any], min_score: int = 70) -> bool:
    """Quick check: is the email deliverable and worth sending to?

    Hunter's score is 0-100. 70+ is generally safe to send to.
    Status 'accept_all' is risky — we treat it as not usable.
    """
    if not result.get("ok"):
        return False
    data = (result.get("data") or {}).get("data") or {}
    score = data.get("score", 0)
    status = data.get("status", "unknown")
    if status in ("invalid", "disposable", "unknown"):
        return False
    if status == "accept_all":
        return False
    return score >= min_score
