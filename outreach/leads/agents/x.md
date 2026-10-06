# X / Twitter agent

First read `COMMON.md`. Needs `X_BEARER_TOKEN` in the shell. Without it, write an empty `x.json` (`[]`) and report
"no token"; do **not** scrape the site.

Run `node ../sources/x-api.mjs --out ../runs/<date>/x.json` (recent search, last 7 days, English, no retweets). The
script builds queries from the pain themes and hashtags (#bookkeeping, #smallbiz, #accounting, #freelance) and ranks by
engagement. Then read the items and write drafts. Replies on X must be under 280 characters: keep them to that, and
never send any. Item ids: `X-<tweetid>`. Do not record the handle; the link is enough.
