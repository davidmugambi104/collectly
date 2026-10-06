# Mugavi lead sourcing (find, rank, draft; you post by hand)

One sub-agent per platform finds fresh conversations about chasing invoices and late payment. Each writes a normalized
JSON file. A coordinator (`rank.mjs`) merges them, drops what should not be answered, ranks the rest, attaches the
drafted replies, lints the drafts and writes one report you can scan in minutes. **Nothing is ever posted, sent or
messaged by this system.** You copy, tweak and post yourself.

## Run on demand
1. Pick a run folder: `outreach/leads/runs/YYYY-MM-DD/` (the date of the sweep).
2. Launch the platform agents in parallel (see `agents/*.md`; each brief is a self-contained prompt). Each writes
   `runs/<date>/<platform>.json` (items) and `runs/<date>/drafts-<platform>.json` (drafts).
3. Run the coordinator: `node outreach/leads/rank.mjs --run 2026-10-06 --top 25`
4. Open `runs/<date>/report.md` (or `report.html`). Copy a draft, edit it into your own words, post it yourself.

Tests: `node --test outreach/leads/*.test.mjs` (they are outside `src/`, so `npm test` does not run them).

## What each platform can do today
| Platform | Access | How |
|---|---|---|
| Reddit | Your debug Chrome (read-only, no login) works today. The Reddit API works once `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are set in your shell. | `agents/reddit.md`, `sources/reddit-api.mjs` |
| X / Twitter | Needs an API bearer token in `X_BEARER_TOKEN` (the search endpoint is not available without one). Scraping the site is not done. | `agents/x.md`, `sources/x-api.mjs` |
| LinkedIn | No public search API for posts. Scraping breaks LinkedIn's terms and risks your account, so it is not done. You paste post links or text you found into `runs/<date>/linkedin-inbox.txt` and the agent ranks and drafts. | `agents/linkedin.md` |
| QuickBooks Community (Intuit) | Public pages, read-only through your Chrome. Where bookkeepers actually ask. | `agents/quickbooks-community.md` |

Credentials are read from your shell environment only. They are never written to files or reports.

## Item file (`<platform>.json`: array of objects)
```
{ "id": "RD-1abcde", "platform": "reddit", "url": "https://...", "community": "r/Bookkeeping",
  "title": "...", "text": "first 600 chars of the post, no usernames or contact details",
  "createdAt": "2026-10-05T14:03:00Z", "score": 12, "comments": 4, "locked": false, "flags": [] }
```
IDs: `RD-<postid>`, `X-<tweetid>`, `QC-<n>`, `LI-<n>`. No usernames, no emails, no phone numbers anywhere.

## Drafts file (`drafts-<platform>.json`: object keyed by item id)
```
{ "RD-1abcde": { "painPoint": "one line", "reply": "the drafted comment", "mentionsMugavi": false, "mentionReason": "" } }
```
Rules for drafts are in `agents/COMMON.md`. `lib/lint.mjs` rejects dashes, hype words, links, and any Mugavi mention
that has no reason.
