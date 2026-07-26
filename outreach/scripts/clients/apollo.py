"""Apollo.io client — bulk prospect discovery.

Used for:
- People search: filter by title, company size, industry, location → bulk people
- People enrichment: name + domain → full contact record (email, phone, title)
- Organization search: domain → firmographic data
- Bulk people enrichment: up to 10 people per request

Free tier: ~833 credits/yr (~70/mo on the new free plan, 50 on trial).
Credit costs (per Apollo docs):
- People match: 1 credit per matched person
- People enrichment (email only): 1 credit
- People enrichment (email + phone): 9 credits
- Bulk people enrichment: 1-9 credits per person
- Organization enrichment: 1 credit per org
- Search endpoints: 0 credits (but consumed during search actions)

API key: /home/davie/.openclaw/secrets/collectly/APOLLO_API_KEY

Docs: https://docs.apollo.io/reference/introduction
"""
from typing import Any, Dict, List, Optional

from . import load_secret, request

API_BASE = "https://api.apollo.io/api/v1"


def _key() -> Optional[str]:
    return load_secret("APOLLO_API_KEY")


def _auth_headers() -> Dict[str, str]:
    key = _key()
    if not key:
        return {}
    return {"X-Api-Key": key}


# ---------------------------------------------------------------------------
# People search (filter-based bulk discovery)
# ---------------------------------------------------------------------------

def people_search(
    *,
    person_titles: Optional[List[str]] = None,
    person_locations: Optional[List[str]] = None,
    person_seniorities: Optional[List[str]] = None,
    q_keywords: Optional[str] = None,
    organization_num_employees_ranges: Optional[List[str]] = None,
    organization_locations: Optional[List[str]] = None,
    organization_industry_tag_ids: Optional[List[str]] = None,
    contact_email_status: Optional[List[str]] = None,
    page: int = 1,
    per_page: int = 25,
) -> Dict[str, Any]:
    """Search Apollo's people database.

    Filters that matter for us:
        person_titles=["Founder", "CEO", "Owner", "Managing Director", "COO"]
        person_locations=["United States", "United Kingdom", "Australia", "Canada"]
        organization_num_employees_ranges=["5,10", "11,20", "21,50"]
        organization_industry_tag_ids=[...]  # Apollo's industry tag IDs

    Returns paginated results. Each page = 1-100 people, default 25.
    Cost: 0 credits for the search call itself, but each person matched
    on a subsequent enrichment call costs credits.

    Docs: https://docs.apollo.io/reference/people-search
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "APOLLO_API_KEY not set", "data": None}

    body: Dict[str, Any] = {"page": page, "per_page": per_page}
    if person_titles:
        body["person_titles[]"] = person_titles
    if person_locations:
        body["person_locations[]"] = person_locations
    if person_seniorities:
        body["person_seniorities[]"] = person_seniorities
    if q_keywords:
        body["q_keywords"] = q_keywords
    if organization_num_employees_ranges:
        body["organization_num_employees_ranges[]"] = organization_num_employees_ranges
    if organization_locations:
        body["organization_locations[]"] = organization_locations
    if organization_industry_tag_ids:
        body["organization_industry_tag_ids[]"] = organization_industry_tag_ids
    if contact_email_status:
        # ["verified", "guessed", "unverified", "likely_to_engage", etc.]
        body["contact_email_status[]"] = contact_email_status

    headers = {**_auth_headers(), "Content-Type": "application/json"}
    return request("POST", f"{API_BASE}/mixed_people/search", headers=headers, json_body=body)


# ---------------------------------------------------------------------------
# People enrichment (1 person at a time, returns email + firmographic)
# ---------------------------------------------------------------------------

def people_enrichment(
    *,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    name: Optional[str] = None,
    email: Optional[str] = None,
    domain: Optional[str] = None,
    linkedin_url: Optional[str] = None,
    reveal_personal_emails: bool = False,
) -> Dict[str, Any]:
    """Enrich a single person. 1 credit for email-only, 9 for email+phone.

    At least one of (first_name+last_name), name, email, or linkedin_url is required.

    Docs: https://docs.apollo.io/reference/people-enrichment
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "APOLLO_API_KEY not set", "data": None}

    body: Dict[str, Any] = {"reveal_personal_emails": reveal_personal_emails}
    if first_name:
        body["first_name"] = first_name
    if last_name:
        body["last_name"] = last_name
    if name:
        body["name"] = name
    if email:
        body["email"] = email
    if domain:
        body["domain"] = domain
    if linkedin_url:
        body["linkedin_url"] = linkedin_url

    headers = {**_auth_headers(), "Content-Type": "application/json"}
    return request("POST", f"{API_BASE}/people/match", headers=headers, json_body=body)


# ---------------------------------------------------------------------------
# Bulk people enrichment (up to 10 per request, 1-9 credits per match)
# ---------------------------------------------------------------------------

def bulk_people_enrichment(people: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Enrich up to 10 people in one call. Each person dict can include:
    first_name, last_name, name, email, domain, linkedin_url.

    Cost: 1 credit per person matched (with email).
    Docs: https://docs.apollo.io/reference/bulk-people-enrichment
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "APOLLO_API_KEY not set", "data": None}
    if not people or len(people) > 10:
        return {"ok": False, "error": "people must be 1-10 entries", "data": None}

    headers = {**_auth_headers(), "Content-Type": "application/json"}
    return request(
        "POST",
        f"{API_BASE}/people/bulk_match",
        headers=headers,
        json_body={"details": people, "reveal_personal_emails": False},
    )


# ---------------------------------------------------------------------------
# Organization enrichment
# ---------------------------------------------------------------------------

def organization_enrichment(domain: str) -> Dict[str, Any]:
    """Get firmographic data for a domain. 1 credit.

    Returns industry, employee count, revenue range, tech stack, etc.
    Docs: https://docs.apollo.io/reference/organization-enrichment
    """
    key = _key()
    if not key:
        return {"ok": False, "error": "APOLLO_API_KEY not set", "data": None}

    headers = {**_auth_headers(), "Content-Type": "application/json"}
    return request(
        "POST",
        f"{API_BASE}/organizations/enrich",
        headers=headers,
        json_body={"domain": domain},
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_email(person: Dict[str, Any]) -> Optional[str]:
    """Pull the best email out of an Apollo people record."""
    return person.get("email") or None


def extract_firmographic(person: Dict[str, Any]) -> Dict[str, Any]:
    """Pull the org-level firmographic fields from a person record."""
    org = (person or {}).get("organization") or {}
    return {
        "company": org.get("name"),
        "domain": org.get("primary_domain") or org.get("website_url"),
        "industry": org.get("industry"),
        "employee_count": org.get("estimated_num_employees"),
        "revenue": org.get("estimated_annual_revenue"),
        "country": (org.get("country") or org.get("location") or ""),
        "city": org.get("city"),
        "linkedin_url": org.get("linkedin_url"),
    }
