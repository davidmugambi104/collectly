# Reddit agent

First read `COMMON.md` and `~/collectly-market-research/26-reddit-sweep-2026-10-03.md` (what gets punished, which
subreddits ban promotion).

Window: posts and comments from the **last 7 days**. Subreddits: r/marketing, r/smallbusiness, r/smallbusinessowner,
r/bookkeeping (r/Bookkeeping), r/accounting (r/Accounting), r/QuickBooks, r/xero, r/Entrepreneur, r/agency,
r/PPC, r/digital_marketing.

How (read-only, your Chrome, no login): open `old.reddit.com/r/<sub>/search?q=<query>&restrict_sr=on&sort=new&t=week`
for each subreddit and query. Queries: `chasing invoices`, `unpaid invoice`, `late payment`, `overdue invoice`,
`client won't pay`, `invoice reminder`, `accounts receivable`, `cash flow unpaid`, `net 30`. Read the result list with
Runtime.evaluate (titles, comment counts, scores, relative times, thread URLs), then open the 15 best-looking threads and
read the post body and the top comments, because comments in other threads also count: if a comment describes the pain
directly and the thread is open, add the comment as its own item with the thread URL plus `#<commentid>` when known.
Skip threads over 7 days old for this run unless the post is still active (new comments in the last 2 days).
`createdAt` must be an ISO time (convert "x hours ago" relative to now). Set `locked: true` for locked or archived threads.

Item ids: `RD-<postid>` (the id in the URL after /comments/). If the Reddit API variables are set in the shell
(`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) you may use `node ../sources/reddit-api.mjs --out ../runs/<date>/reddit.json`
instead of the browser. Never print them.
