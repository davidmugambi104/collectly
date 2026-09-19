# Decision log — 2026-09-19

## The campaign has a measured reply rate for the first time: 0.34%

Reply tracking has never worked. `poll_replies.py` was pointed at
`imap.gmail.com` while inbound mail for getcollectly.app is on Zoho, and Zoho's
free tier has no IMAP at all — so the poller could not have authenticated even
with a correct password. 313 emails went out between 2026-08-08 and 2026-09-10
with nothing measuring what came back, and `check_reply_stats.py` crashed on a
`status` column that has never existed, so nobody saw the gap either.

Zoho Mail Lite is now active, IMAP is enabled, and the mailbox has been read
directly.

### What came back

| | |
|---|---|
| Prospects emailed (delivered) | 292 |
| Replies | **1** |
| Reply rate | **0.34%** |
| Messages scanned | 1,024 (INBOX) + Spam + Trash, both empty |

The one reply is P050 (goldfront.com), subject "Re: Quick question".

Matching was by sender address, not `In-Reply-To`: the log stores Resend's
internal UUIDs rather than RFC Message-IDs, so header threading was never
possible with this data. Address matching also catches a colleague replying
from a different mailbox — only two prospect domains appear in the inbox at
all, so there is no hidden pocket of replies.

### What the policy says

`policy/limits.json` sets `reply_rate_pct_kill_below: 2.0` and
`min_sends_for_kill: 50`. At 292 sends and 0.34% this is roughly six times the
sample needed to make the call, at one sixth of the kill threshold.

**The policy says kill or rework. It does not say scale, and it does not say
send more of the same.**

### Consequently

- The 104 held follow-ups are NOT released on the current sequence. Follow-ups
  typically lift reply rates two to threefold; three times 0.34% is still
  around 1%, still below the kill line. Sending them as-is spends the list to
  confirm something already known.
- No new t1 volume until the message or the targeting changes. The
  deliverability gate is honest now (pullback, cap 30) and role addresses are
  blocked in `daily_send.py`, so the mechanics are sound — the mechanics were
  never the problem.
- The 18.2% bounce rate is a separate finding with a separate cause (role
  addresses, 39.1% vs 1.8% for personal) and is already fixed at the send path.

### What is worth doing instead

The list is not obviously wrong — 292 agencies and bookkeeping practices is a
reasonable ICP for this product. The message is the untested variable, and it
has now been tested once, at scale, with one outcome. Rewriting the t1 and
running 50 sends against the personal-address segment would cost little and
produce a comparable number. That is a decision for Davie, not for this log.

### Data recorded

`data/outreach-log.csv` now carries a reply outcome for every delivered send —
`yes` for P050, `no` for the other 291. Previously the column was empty on all
330 rows, which is why the ICP refinement engine had nothing to work from.
Backup at `data/outreach-log.csv.bak-20260919`.

`check_reply_stats.py` now reports the rate by PERSON as well as by row. A
prospect who replies gets a second row logged (`touch=recovery_reply`), so
counting rows double-counts exactly the people being measured: the row figure
reads 0.6% where the real rate is 0.34%. It also prints the policy comparison
directly, so the kill threshold cannot be missed again.
