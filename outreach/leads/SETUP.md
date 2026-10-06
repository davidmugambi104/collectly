# Unblocking the big three (about 5 minutes each, done by you)

What exists today without any credentials: QuickBooks Community and AccountingWEB read through your Chrome. In the
first run (2026-10-06) they gave 2 items between them, because those forums have little invoice-chasing traffic in any
given week. The volume is on Reddit, X and LinkedIn, and each needs something only you can provide.

## Reddit (best source)
Option A, API (preferred, steady):
1. Log in to Reddit, open https://www.reddit.com/prefs/apps and create an app of type **script** (name: mugavi-lead-search,
   redirect uri: http://localhost:8080). Copy the client id (under the app name) and the secret.
2. In the shell where you start Claude Code: `export REDDIT_CLIENT_ID=...` and `export REDDIT_CLIENT_SECRET=...`
   (do not paste them into chat or files).
3. Then: `node outreach/leads/sources/reddit-api.mjs --out outreach/leads/runs/$(date +%F)/reddit.json`
Option B, browser: sign in to Reddit in the debug Chrome (port 9222) once. The Reddit agent then reads old.reddit.com
search pages read-only, as it did on 2026-10-03. The fresh Chrome profile is logged out and gets a login wall.
Reddit's API terms ask for a clear User-Agent and low request rates; the fetcher sets both.

## X / Twitter
Needs an X developer account with a **bearer token** that has recent-search access (the free tier does not include
search; a paid tier does). `export X_BEARER_TOKEN=...`, then `node outreach/leads/sources/x-api.mjs --out outreach/leads/runs/$(date +%F)/x.json`.
Without a paid tier, skip X; do not scrape it.

## LinkedIn
No post-search API exists and scraping risks your account. Instead, spend 10 minutes a week: search LinkedIn for
"chasing invoices", "clients not paying", "late paying clients", "fractional bookkeeper", filter to Posts, past week,
and paste the post links (or text) into `runs/<date>/linkedin-inbox.txt`, one block per post, a blank line between.
The LinkedIn agent drafts the comments.

## Then
`node outreach/leads/rank.mjs --run $(date +%F) --top 25` and open `runs/<date>/report.html`.
