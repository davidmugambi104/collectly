# Bookkeeper / Fractional Controller Outreach

## Target persona
- Fractional bookkeeper, controller, or accounting professional serving 5–10 small agencies or service businesses
- Lists "agencies," "creative businesses," "professional services," or "SMB" as a specialty in their LinkedIn bio
- Active on LinkedIn (posts or comments at least occasionally)

## Goal
Get 10 DMs out today. Offer a free "AR health check" for one of their agency clients in exchange for 10 minutes of feedback.

## DM template (short, no pitch)

```
Hi [First Name],

Saw you work with agencies — quick question.

One of your agency clients probably has an aging invoice or two that nobody wants to chase. I'm building a tool that automates the awkward follow-up part (email/SMS, tone-aware, synced to QBO/Xero) so the agency doesn't have to do it manually.

Worth 10 minutes this week? I'd run a free AR health check for one client you pick, no strings, just to learn whether this is actually painful or just annoying.

Davie
```

## Tracking
Log every DM attempt to `outreach/data/outreach-log.csv` with:
- `id`: BK001, BK002, ...
- `email`: LinkedIn profile URL
- `touch`: `bk_dm`
- `status`: `sent`, `replied_positive`, `replied_not_interested`, `replied_unsubscribe`, `no_reply`
- `detail`: bookkeeper_channel; agency_specialty

## Success threshold
≥2 unprompted "yes" out of 10 = channel is viable.
0–1 = reassess product urgency or channel.
