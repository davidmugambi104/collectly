# Unblocking the big three (about 5 minutes each, done by you)

What exists today without any credentials: QuickBooks Community and AccountingWEB read through your Chrome. In the
first run (2026-10-06) they gave 2 items between them, because those forums have little invoice-chasing traffic in any
given week. The volume is on Reddit, X and LinkedIn, and each needs something only you can provide.

## Reddit (read-only API: date-ranged search, no scraping)
1. Sign in to Reddit and open https://www.reddit.com/prefs/apps. If Reddit shows an access or approval notice instead of a
   "create another app" button, follow its steps first (Reddit has been tightening who can create API keys; approval can
   take days). Use the account you want attached to the app.
2. Click **create another app**. Name: `mugavi-lead-search`. Type: **script**. Redirect uri: `http://localhost:8080`
   (never used, but required). Description: `read-only search for customer research`. Click create.
3. The client id is the short string under the app name ("personal use script"). The secret is labelled `secret`.
4. In the shell where you start Claude Code, run (do not paste these into chat, files or git):
   `export REDDIT_CLIENT_ID='...'` and `export REDDIT_CLIENT_SECRET='...'`. To keep them across restarts, put the two
   lines in `~/.bashrc` (readable only by you) rather than in the repo.
5. Prove the keys work (token request only, nothing is searched): `node outreach/leads/sources/reddit-api.mjs --check`
6. Run the date-ranged search: `node outreach/leads/sources/reddit-api.mjs --out outreach/leads/runs/$(date +%F)/reddit.json --days 7`
   Options: `--days 3`, `--subs Bookkeeping,QuickBooks`, `--queries "chasing invoices|late payment"`.
7. Rank and read: `node outreach/leads/rank.mjs --run $(date +%F)` then open `runs/<date>/report.html`.
The fetcher only searches (GET). It never posts, votes or messages, and it identifies itself with a clear User-Agent.
Option B, browser: the logged-out www.reddit.com search in the debug Chrome still works for the agents.

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
