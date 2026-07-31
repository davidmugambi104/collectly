# Agent 10: Outreach automation scripts

## Tests run (with verbatim output)

### 1. Script inventory

```
-rw-rw-r-- 1 davie davie  8039 Jul 27 23:49 check_replies_imap.py
-rw-rw-r-- 1 davie davie  1223 Jul 25 13:34 check_reply_stats.py
-rwxrwxr-x 1 davie davie  4956 Jul 20 13:07 daily_outreach.py
-rwxrwxr-x 1 davie davie  6219 Jul 20 13:56 daily_outreach_v2.py
-rwxrwxr-x 1 davie davie 11180 Jul 25 23:19 daily_send.py
-rwxrwxr-x 1 davie davie  9222 Jul 20 13:56 discover_prospects.py
-rw-rw-r-- 1 davie davie  3670 Jul 24 18:57 free_email_finder.py
-rw-rw-r-- 1 davie davie  2404 Jul 25 13:35 generate_daily_digest.py
-rwxrwxr-x 1 davie davie  3646 Jul 20 13:57 generate_linkedin_tasks.py
-rw-rw-r-- 1 davie davie  6241 Jul 24 19:26 generate_t1_drafts.py
-rwxrwxr-x 1 davie davie  3637 Jul 20 13:09 linkedin_helper.py
-rwxrwxr-x 1 davie davie  4222 Jul 30 17:43 outreach_state.py
-rwxrwxr-x 1 davie davie  7025 Jul 27 11:50 poll_replies.py
-rwxrwxr-x 1 davie davie  4945 Jul 30 15:09 process_audit_request.py
-rwxrwxr-x 1 davie davie  3565 Jul 30 17:44 process_inbound.py
-rwxrwxr-x 1 davie davie  1917 Jul 30 17:45 reply_webhook_handler.py
-rw-rw-r-- 1 davie davie  5419 Jul 25 13:26 resend_webhook.py
-rw-rw-r-- 1 davie davie  3694 Jul 30 15:27 run_seed_inbox_test.py
-rw-rw-r-- 1 davie davie  4839 Jul 24 19:35 scrape_agency_websites.py
-rwxrwxr-x 1 davie davie  4080 Jul 25 23:19 send-gmail.py
-rwxrwxrwxr-x 1 davie davie  6250 Jul 30 17:28 send_bookkeeper_batch.py
-rw-rw-r-- 1 davie davie  6299 Jul 25 23:19 send_t1_t2.py
-rwxrwxr-x 1 davie davie  5200 Jul 20 12:41 send_touch.py
-rw-rw-r-- 1 davie davie  5278 Jul 23 01:47 send_touch_v2.py
-rw-rw-r-- 1 davie davie  9112 Jul 29 14:51 send_warmup.py
-rwxrwxr-x 1 davie davie  4006 Jul 30 17:44 send_with_guard.py
-rwxrwxr-x 1 davie davie  2536 Jul 23 18:44 state.py
-rw-rw-r-- 1 davie davie  3409 Jul 25 13:29 test_reply_tracking.py
-rw-rw-r-- 1 davie davie  5992 Jul 20 14:04 triage_reply.py
-rw-rw-r-- 1 davie davie  8053 Jul 29 14:47 warmup_check_replies.py
```

### 2. Python environment

```
/usr/bin/python3
Python 3.12.3
/home/davie/.openclaw/workspace/.venv/bin/python
```

A project virtualenv exists. Scripts use `/usr/bin/env python3` shebangs, so the `.venv` interpreter is only used if invoked explicitly.

### 3. Dry-run of main scripts

#### daily_outreach_v2.py --dry-run

```
=== Daily outreach 2026-07-31 ===
sent today: 0, capacity remaining: 40
candidates: 2, sending: 2
❌ P031 stan@stanbranding.com                    -> gmail options: read credentials: read OAuth client secret from keyring: read secret: get secret: rea
❌ P032 sam@wildishandco.co.uk                   -> gmail options: read credentials: read OAuth client secret from keyring: read secret: get secret: rea

=== REPORT ===
{
  "date": "2026-07-31",
  "sent_this_run": 0,
  "errors": 2,
  "capacity_remaining": 40,
  "by_segment_this_run": {
    "web_design": 0,
    "marketing": 0,
    "branding": 0
  },
  "best_segment_overall": "",
  "recommendation": "Best segment is . Add more prospects to this segment for next run."
}
```

This script shells out to `gog send` and fails because the keyring backend is TTY-locked (`no TTY available for keyring file backend password prompt; set GOG_KEYRING_PASSWORD`). It still writes `err` rows to `outreach-log.csv`.

#### daily_send.py --tier 1 --dry-run

```
No eligible prospects for tier 1.
```

No crash, but it can't show behavior because the prospects/tier pipeline is empty.

#### send_warmup.py --day 1 --dry-run

```
[DRY] W0111 -> sharonkarendi8@gmail.com | subject: Quick catch up
       body preview: Hey Sharon,  Hope you're doing well. What's keeping you busy these days?  Reply and let me know — always curious what yo
[DRY] W0112 -> faithmugendi22@gmail.com | subject: How's things?
       body preview: Hi Faith,  Saw what you've been up to and thought of you. How's things going?  Quick reply would make my day.  Davie
[DRY] W0113 -> faithntinyari36@gmail.com | subject: Checking in
       body preview: Hey Faith,  It's been a while. How are things going on your end?  Would love a quick update.  Davie

=== Warmup day 1: 3/3 sent ===
```

Clean dry-run.

#### check_replies_imap.py --dry-run

```
no replies in last 6h
```

Accepts `--dry-run` and runs without crashing.

#### warmup_check_replies.py --days 1

```
No warmup replies found.
```

Does not accept `--dry-run`; running with `--days 1` is safe.

#### send-gmail.py --dry-run /dev/null

```
No drafts to send.
```

Requires a `draft_csv` argument. Dry-run works when given an empty path.

#### run_seed_inbox_test.py --dry-run

```
Sending to --dry-run ...
  FAIL 422: {"statusCode":422,"name":"validation_error","message":"Invalid `to` field. The email address needs to follow the `email@example.com` or `Name <email@example.com>` format."}
```

This script treats `--dry-run` as the first recipient email because it does not implement a dry-run flag. It has a real bug.

### 4. State files

#### state.py

- Format: CSV-backed.
  - `CSV_PATH`: `collectly/outreach/data/prospects.csv` (read-only lookup).
  - `LOG_PATH`: `collectly/outreach/data/outreach-log.csv` (append-only).
- `SKIP_STATUSES` = sent, replied, replied_do_not_contact, positive_reply, booked_chat, bounced, do_not_contact, unsubscribed, wrong_person_forward.
- Functions: `load_prospects`, `save_prospects`, `load_log`, `append_log`, `is_skipped`, `is_in_open_status`.

#### outreach_state.py

- Format: JSON file at `collectly/outreach/data/outreach-state.json`.
- Top-level keys: `contacts`, `emails`, `notes`.
- `emails` stores `{normalized_email}:{touch}` → ISO timestamp for dedup.
- `contacts` stores per-email state, `sent_history`, `replies`, `created_at`.
- `DEDUP_DAYS = 7`.

**Verdict:** The two state files are not the same format and are not automatically kept in sync. `state.py` is used by the older v1/v2 scripts; `outreach_state.py` is used by the newer pipeline (`daily_send.py`, `send_with_guard.py`, `process_inbound.py`, etc.). `outreach-log.csv` is the common append target, so at least sends/replies are partially reconciled there, but dedup logic differs.

### 5. Cron entry

```
(no crontab entry found)
```

No scheduled execution for any outreach script.

### 6. Best-practice search findings

- Python Cron Jobs: APScheduler, Celery & Schedule Guide | CronJobPro  
  https://cronjobpro.com/blog/python-cron-jobs
- How to Run Cron Jobs in Docker Containers (2026 Guide) | CronJobPro  
  https://cronjobpro.com/blog/docker-cron-job
- Solved: Monitoring Cron Job Failures: A Wrapper Script approach  
  https://techresolve.blog/2025/12/24/monitoring-cron-job-failures-a-wrapper-script-app/
- The Complete Guide to Production-Ready Python Automation (2026 Edition)  
  https://python.plainenglish.io/the-complete-guide-to-production-ready-python-automation-2026-edition-021590e847ac
- Microsoft Amplifier config-state-patterns: atomic state writes, safe defaults, merge-by-default  
  https://github.com/microsoft/amplifier-bundle-skills/blob/main/skills/config-state-patterns/SKILL.md
- IronFighter23/safe-state: resumable execution / checkpoint decorator pattern for Python  
  https://github.com/IronFighter23/safe-state

Key takeaways from the search:
- Production automation needs wrapper scripts, structured logging, and health checks.
- State files should use atomic writes (write-then-rename) so crashes don't corrupt state.
- Cron should be replaced or augmented with systemd timers or a scheduler with monitoring and retry backoff.
- Dry-run should be a first-class flag, not parsed as an email address.

## What I found

### Live scripts

| Script | Status | Notes |
|--------|--------|-------|
| `send_warmup.py` | ✅ Live | Dry-run works; reads `warmup-contacts.csv` and `warmup-templates-v2.md`; sends via Resend; volume-capped by day map. |
| `daily_send.py` | ✅ Live-ish | Runs without crash but reports "No eligible prospects for tier 1"; depends on `outreach_state.py`. |
| `check_replies_imap.py` | ✅ Live-ish | Accepts `--dry-run`, polls Gmail IMAP, but has hard-coded Gmail credentials and a narrow `Re: Who chases invoices?` subject filter. |
| `warmup_check_replies.py` | ✅ Live-ish | Runs safely; no `--dry-run`; only checks warmup contacts. |
| `send-gmail.py` | ⚠️ Live but manual | Requires a draft CSV; uses `/home/davie/.openclaw/secrets/collectly/` for credentials. Cannot be run ad-hoc without a CSV. |
| `run_seed_inbox_test.py` | ❌ Broken | Does not implement `--dry-run`; parses it as the recipient and sends a real (failing) API call. |
| `daily_outreach_v2.py` | ❌ Broken in practice | Dry-run crashes because it shells out to `gog send` and the keyring has no TTY. Still appends `err` rows to the log. |
| `daily_outreach.py` | ❌ Superseded | Older v1 script; last touched Jul 20; `MAX_PER_RUN=5`; uses `state.py`. v2 exists. |
| `state.py` | ⚠️ Legacy | Used only by v1/v2. Active writes happen through it, but the newer pipeline uses `outreach_state.py`. |
| `outreach_state.py` | ✅ Active | Used by `daily_send.py`, `send_with_guard.py`, `process_inbound.py`, `process_audit_request.py`, `reply_webhook_handler.py`. |

### State file drift

- Two state systems: legacy CSV log (`state.py`) and newer JSON (`outreach_state.py`).
- `outreach-state.json` exists (3.9 KB, last modified Jul 30 17:44) and is actively written.
- `outreach-log.csv` is 256 rows, last modified Jul 31 16:07 (today), confirming active appends.
- `seed-inbox-test-log.csv` was corrupted by the bug: it contains a `--dry-run` row with a 422 error.

### Environment requirements

- `.venv` is present but shebangs point to system `python3`.
- `gog` CLI keyring is the blocker for `daily_outreach_v2.py`.
- Resend API key is read from `.env.local`; seed test already shows a previous 403 for unverified `gmail.com` domain that has since been fixed.
- Gmail scripts have an app password hard-coded in `check_replies_imap.py`.

### No scheduling

- No `crontab` entry. Nothing is running automatically. The whole outreach stack is currently manual.

## What should change

### Priority 1 — Fix broken scripts
1. **`run_seed_inbox_test.py`**: add `argparse` with `--dry-run` and only call `send_test_email` when not dry-running.
2. **`daily_outreach_v2.py`**: either remove the `gog send` shell-out and migrate to Resend, or ensure `GOG_KEYRING_PASSWORD` is available in cron/systemd environments. Also stop logging `err` rows during dry-run.

### Priority 2 — State consolidation
3. Pick one state layer: deprecate `state.py` and route all scripts through `outreach_state.py` + `outreach-log.csv`.
4. Add atomic writes (`tmp` + rename) in `outreach_state.py` to avoid JSON corruption if the process is killed.

### Priority 3 — Production scheduling + observability
5. Add a systemd timer or cron entry that runs `daily_send.py --tier 1` and `check_replies_imap.py` at scheduled times.
6. Wrap cron commands in a logging wrapper that captures exit code and stderr to `outreach/logs/`.
7. Add a health-check command that reports: last send time, last reply check, queue size, errors in last 24 h.

### Priority 4 — Security
8. Remove the hard-coded Gmail app password from `check_replies_imap.py`; move it to `/home/davie/.openclaw/secrets/collectly/`.
9. Ensure the venv interpreter is used in production (activate in cron or use explicit `.venv/bin/python` path).

## Source / evidence

- File listing: `ls -la /home/davie/.openclaw/workspace/collectly/outreach/scripts/*.py`
- Python env: `which python3 && python3 --version && ls /home/davie/.openclaw/workspace/.venv/bin/python`
- Dry-run outputs captured above for each target script.
- State files: `state.py` and `outreach_state.py` source (first 80 lines each) and `outreach-state.json` mtime.
- Cron: `crontab -l | grep -i outreach` returned empty.
- `outreach-log.csv` tail shows `err` rows from the failed v2 dry-run and the corrupted `--dry-run` seed test row.
