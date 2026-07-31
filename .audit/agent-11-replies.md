# Agent 11: Reply tracking

## Tests run (with verbatim output)

### Live polling processes
```
(Command exited with code 1)
```
No matching processes found.

### Cron
```
(Command exited with code 1)
```
No crontab for this user, or `crontab -l` failed.

### Vercel crons
```
Vercel CLI 56.3.2 (Node.js 22.22.3) | crons is in beta — https://vercel.com/feedback
Retrieving project…
Fetching cron jobs for david-mugambis-projects/collectly [337ms]
> 1 cron job found for david-mugambis-projects/collectly [337ms]

  Path                       Schedule
  /api/cron/dunning          0 14 * *
```
Only the dunning cron is configured. There is **no reply-check cron** in Vercel.

### grep for reply-check / collectly-reply
```
/home/davie/.openclaw/workspace/collectly/.audit/agent-9-outreach-policy.md
/home/davie/.openclaw/workspace/collectly/.audit/agent-11-replies.md
/home/davie/.openclaw/workspace/collectly/outreach/policy/collectly_bot_policy.md
```
The only live hit is the policy doc itself. No actual cron/CI/script entry named `collectly-reply-check` was found in the repo.

### check_replies_imap.py dry-run
```
no replies in last 6h
```
The script runs but searches the wrong inbox (`davidmugambi104@gmail.com`) and only matches the old Gmail campaign subject `Re: Who chases invoices?`. Resend outbound now uses `davie@getcollectly.app` and many subjects from the experiment matrix.

## Best-practice search findings

- **IMAP app-password reliability (2026):** Gmail still supports app passwords, but Google has been tightening less-secure-app access and Workspace/IMAP behavior can change. Multiple 2026 guides (Unipile, SMTPedia, Mailjerry) frame IMAP as a fallback; the recommended production path is OAuth-based Gmail API or vendor inbound webhooks. Hardcoded app passwords in source code are a security risk and will break if the password is rotated.
- **Webhook vs polling tradeoffs:** Mailhook/LobsterMail/MailParse consensus is "webhooks for fast event delivery, polling for controlled retrieval and recovery." Best practice is **webhooks primary + polling backup**, not polling only. Webhooks give sub-minute reply detection and avoid storing mailbox credentials in app code. Polling is useful as a safety net (e.g., every 30 min) for missed webhooks or inbox-side failures.
- The policy doc itself says positive replies should notify fast and not go longer than ~30 min.

## What I found

1. **No live reply detection path for the current Resend/ getcollectly.app channel.**
   - `check_replies_imap.py` points to `davidmugambi104@gmail.com` (old Gmail sender) and the old subject line. It does not read Resend sends or the `getcollectly.app` inbox.
   - `poll_replies.py` points to `davie@getcollectly.app` via IMAP, but has no app password set (`IMAP_PASSWORD` env is empty), so it exits immediately. It is not running, not scheduled, and not wired to any Vercel cron.
   - `reply_webhook_handler.py` is a reference HTTP server that is not deployed or running anywhere.
   - `process_inbound.py` is only useful when invoked by a webhook or CLI.

2. **No polling cadence exists.** No process, no cron, no Vercel cron. Reply detection is currently manual at best.

3. **Credential/config risk:** `check_replies_imap.py` hardcodes a Gmail app password in plain text. Even though Gmail is deprecated per policy, this is still a live credential in the repo.

4. **Policy says Resend inbound webhook at `https://getcollectly.app/api/inbound` is deployed (2026-07-31), but there is no evidence in the repo or running processes that the handler is live.** The reference script is not integrated into the main app; the only Vercel cron is dunning.

5. **State/log mismatch:** Two separate state mechanisms exist:
   - `outreach/data/outreach-log.csv` (used by `poll_replies.py`)
   - `outreach/data/outreach-state.json` (used by `process_inbound.py`)
   They are not synchronized. A webhook-driven flow updates JSON; an IMAP flow updates CSV.

## What should change

1. **Highest priority: confirm or create the real inbound route.** The policy claims `https://getcollectly.app/api/inbound` is deployed. Verify it exists in the app (`/api/inbound`) and that Resend inbound webhook is pointed at it. If not, add it.
2. **Make the webhook the primary reply detector.** Wire Resend's inbound webhook to `process_inbound.py` (or equivalent app logic) so replies update state automatically and trigger notifications.
3. **Add a polling safety net, not a primary path.**
   - For `davie@getcollectly.app`, either use Resend's inbound API/events or Gmail API with OAuth — not IMAP app password.
   - If IMAP must stay as fallback, move credentials to environment variables, schedule every 15–30 min, and make it update the same state store as the webhook.
4. **Remove or archive `check_replies_imap.py` and `poll_replies.py` as dual sources of truth.** Deprecate the Gmail path fully (the policy already says Gmail is 0/day). The old hardcoded app password should be rotated and the file should stop using it.
5. **Unify state storage.** Decide whether `outreach-state.json` or `outreach-log.csv` is canonical, and make both webhook and (if kept) poller write to it.
6. **Add observability.** Log every inbound event with source (`resend_webhook`, `imap_fallback`, `manual_test`), and alert immediately on positive signals.

## Source / evidence

- `outreach/scripts/check_replies_imap.py` — hardcoded Gmail app password, wrong inbox, old subject filter.
- `outreach/scripts/poll_replies.py` — env-driven IMAP, no password set, no schedule.
- `outreach/scripts/reply_webhook_handler.py` — reference-only HTTP server.
- `outreach/scripts/process_inbound.py` — only triggered by webhook/CLI.
- `outreach/policy/collectly_bot_policy.md` — states Gmail is deprecated, Resend inbound webhook is deployed, reply source filter added.
- Live tests: no processes, no crontab, Vercel only has `/api/cron/dunning`, grep finds only policy mentions.
