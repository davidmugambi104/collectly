# Collectly — Outreach & Launch Readiness Audit

**Audit date:** 2026-07-23 01:16 EAT
**Auditor:** Subagent (depth 1/1)
**Scope:** `/home/davie/.openclaw/workspace/collectly` — outreach/ and launch/ only (app code out of scope)
**Reference docs:** `memory/OPERATING-DIRECTIVE.md`, `memory/MEMORY.md`, `memory/OPERATING-FRAMEWORK.md`

---

## TL;DR — Verdict

**Outreach:** ✅ Ready. Prospects list and templates match the operating directive. Minor hygiene issues (duplicate log row, `last_name` and `hook` mostly empty — both by design).
**Launch:** ⚠️ Launch was 22 July 2026. Today is 23 July. No postmortem exists yet. The launch-day playbook still says "Wed 22 July" in the future tense; the T+24h post-mortem is not in `launch/postmortem/`.
**Docs:** ❌ Stale. README/DEPLOY/CHANGELOG all last touched 13 July (10 days old). DEPLOY.md still says "Block 1 build", still references the pre-GitHub "what Davie needs to do" push steps. CI badge in README points to a repo that may not exist yet.
**CI:** ✅ Well-structured. 4 jobs (lint+typecheck, build, DB schema, gitleaks). Status unknown (no live checks run; can't query GitHub Actions from this audit).

---

## OUTREACH ASSETS

### Directory layout (`collectly/outreach/`)

| Subdir | Files | Notes |
|---|---|---|
| `data/` | 6 | `prospects.csv` (30 rows), `outreach-log.csv` (31 rows), `TIER-1-SHORTLIST.md`, `PROSPECTS-NOTE.md`, `prospects.example.csv`, `prospects.placeholder.csv` |
| `messages/` | 6 | `t1-cold.md`, `t1-cold-v2.md`, `t1-cold-v3-industry-variants.md`, `t2-followup.md`, `t3-final.md`, `t4-close.md` |
| `scripts/` | 14 | 5 shell helpers + 9 Python scripts |
| `queue/` | 4 | `linkedin-helper.md`, `linkedin-tasks.md` (says "0 high-fit prospects with no email"), `t1-sent-2026-07-20.json`, `t1-sent-2026-07-20-gog.csv` |
| root | 1 | `README.md` |
| root | 1 | `interview-guide.md` |

### `data/prospects.csv` — 30 prospects ✅

- **Format:** CSV, 14 columns: `id, first_name, last_name, company, role, country, team_size, industry, linkedin_url, email, source, notes, hook, tier`
- **Row count:** 30 (matches operating directive exactly)
- **Mix:** 18 UK + 12 US. Industry mix: branding (12), design (4), web_design (4), digital_marketing/SEO/PPC (5), ecommerce/beauty (3), motion (1). Aligns with directive.
- **Tier 1 shortlist:** 10 prospects, 5/day cadence (TIER-1-SHORTLIST.md). `tier=1` rows in CSV: P001, P002, P004, P008, P009, P019, P023, P026, P027, P029 = 10 ✅

### Field completeness

| Field | Filled | Empty | Notes |
|---|---|---|---|
| `id` | 30/30 | 0 | ✅ |
| `first_name` | 30/30 | 0 | ✅ Some are "TBD" (12 rows) by design — flagged in `notes` for manual lookup |
| `last_name` | 13/30 | 17 | ⚠️ By design for 13 TBD-founder rows. Not blocking. |
| `company` | 30/30 | 0 | ✅ |
| `role` | 30/30 | 0 | ✅ |
| `country` | 30/30 | 0 | ✅ |
| `team_size` | 30/30 | 0 | ✅ |
| `industry` | 30/30 | 0 | ✅ |
| `linkedin_url` | 30/30 | 0 | ✅ |
| `email` | 30/30 | 0 | ✅ **No missing emails** — operating directive gap closed |
| `source` | 30/30 | 0 | ✅ |
| `notes` | 30/30 | 0 | ✅ |
| `hook` | **0/30** | 30 | ⚠️ Empty across the board. Per v2 template: "If you don't have a real hook, send without it" — this is by design, not a bug. But it means 0 of 10 tier-1 sends had a hook on 2026-07-20 (visible in outreach-log.csv: all `detail` is `hunter_v*`, no `hook:yes`). |
| `tier` | 30/30 | 0 | ✅ |

### `data/outreach-log.csv` — tracking log ✅

- **Format:** CSV, 10 columns: `id, email, touch, sent_at, replied_at, status, next_step, message_id, detail, segment`
- **Row count:** 31 (30 sends + 1 dedup'd status update for P006)
- **Statuses:** 30 `sent`, 1 `replied_do_not_contact` (P006 Lennart — auto-reply: deceased, family asked to use daughter's email)
- **Issue:** ⚠️ **P006 appears twice** (duplicate id). First row = initial send (12:40, migrated_from_gog_log), second row = DNC update (13:16). Status update should be on the same row, not appended as a new row, or the log should be dedup'd by id keeping latest `sent_at`. Either way, downstream scripts that load this log will see P006 twice.
- **Coverage gap:** Operating directive says columns should include `prospect, status, last_contact, next_step`. Present log has `sent_at` (last contact) and `next_step` — but `next_step` is empty for all `sent` rows. **Either fill next_step per cadence (t2/t3/t4) or drop the column.** `replied_at` is empty for everyone except the DNC row (good — no other replies recorded yet).

### Memory says 30 / 3 templates. Reality:
- 30 prospects ✅
- 3 "approved templates" per operating directive: `t1-cold.md`, `t2-followup.md`, `t3-final.md` ✅
- **But there are 6 message files total.** The 3 extras (`t1-cold-v2.md`, `t1-cold-v3-industry-variants.md`, `t4-close.md`) are newer/iterations:
  - `t1-cold-v2.md` is explicitly the replacement for `t1-cold.md` (v1 got 0% positive reply)
  - `t1-cold-v3-industry-variants.md` is the v2-with-industry-match
  - `t4-close.md` extends the 3-touch cadence to 4 touches (day 14) — operating directive still says "max 3 touches"

---

## MESSAGE TEMPLATES

### Count

6 files in `outreach/messages/`. The operating directive's "3 approved templates" still references the original set; in practice the team has grown to 6 with a deprecation ladder.

### Quality check — what I read

**`t1-cold.md`** (v1, deprecated)
- Subject: `Who chases invoices?` — generic, no industry call-out
- 4-paragraph body, conversational
- Placeholders: `{{first_name}}`, `{{segment_label}}`
- Tone: low-friction, "even a one-line reply"
- Status: superseded by v2

**`t1-cold-v2.md`** (current)
- Subject: `QBO invoice, 2 weeks overdue, awkward to chase?` — pain-specific
- 3-paragraph body, 2 sentences each
- Placeholders: `{{first_name}}`, `{{email}}`, `{{hook}}` (optional)
- Has a built-in pass/fail rubric: 0/10 = rewrite, 1/10 = add hooks, 2-3/10 = scale, 4+/10 = move to t2
- "**Do not fabricate a hook.** A naked 'Quick question' still works" — explicit guard against hallucination
- Tone: slightly more confident ("I'm building Collectly for..."), concrete timing ("early, live, starting with a small batch")

**`t1-cold-v3-industry-variants.md`** (current when research available)
- Same subject as v2, 5 industry variants (branding, design, web_design, digital_marketing/SEO/PPC, ecommerce/beauty)
- Industry column → variant mapping table is included
- **Bug:** The "Branding" variant says "12 prospects in tier 2" — but the CSV shows 12 branding prospects across both tiers (5 tier-1, 7 tier-2). Tiny inconsistency.

**`t2-followup.md`** ✅
- Subject: `Re: Who chases invoices?` — thread continuity
- 4-line bump, "even a one-liner is all I need"
- Promise: "If it's a 'no' or wrong person, I won't bother you again"
- Placeholders: `{{first_name}}`, `{{company}}`
- No `{{segment_label}}` here (uses implicit "founder inboxes")

**`t3-final.md`** ✅
- Subject: `Re: Who chases invoices? — different person?`
- Pivot from "tell me" to "forward to the right person"
- Placeholders: `{{first_name}}`, `{{company}}`
- Tone: graceful exit

**`t4-close.md`** (extends cadence to 4 touches — operating directive still says 3)
- Subject: `closing the loop` (lowercase — deliberate or typo?)
- 3-line close + referral ask
- Placeholders: `{{first_name}}`, `{{company}}`, `{{segment_label}}`
- **Inconsistency:** Operating directive says "max 3 touches, 3-5 day spacing". t4 is a 4th touch at day 14. The `send_touch_v2.py` cadence config: t2=3d, t3=7d, t4=14d. So the script implements 4-touch but the directive says 3. **Decide which is canonical.**

### Grammar/tone assessment

- All templates: clear, conversational, no jargon ✅
- No emoji abuse ✅
- Sign-off "David" (not "David Mugambi" or "Davie") — be consistent with the 3-emails-to-send-now.md which signs "Davie Mugambi, founder @ Collectly" and the linkedin-post.txt which also uses "Davie"
- No template has a physical address / unsubscribe footer ⚠️ — **CAN-SPAM / UK PECR / AU Spam Act compliance gap.** The operating directive explicitly says "real unsubscribe path, honest subject lines." Templates must include a footer (or have a List-Unsubscribe header configured in Resend). This is a real compliance risk and should be on the priority list.

---

## TRACKING

### Log exists ✅

`outreach/data/outreach-log.csv` — see fields above.

### Right columns?

- `prospect` → split into `id` + `email` (good)
- `status` → present (sent / replied_do_not_contact)
- `last_contact` → `sent_at` (good)
- `next_step` → present but empty for all 30 sent rows
- `message_id` → present (gog message IDs)
- `detail` → present (template version, segment)
- `segment` → present but mostly empty
- `replied_at` → present (only filled for DNC)

**Per operating directive, the log columns are correct. The empty `next_step` field for all sent rows is a hygiene gap.**

### `outreach/queue/`

- `linkedin-tasks.md` (2026-07-22): "0 high-fit prospects with no email." → confirms the email-as-primary reroute was successful. No LinkedIn tasks to do.
- `t1-sent-2026-07-20-gog.csv`: snapshot of first gog-sent batch, 43 lines
- `t1-sent-2026-07-20.json`: same batch as JSON
- `linkedin-helper.md`: long reference doc, likely from the abandoned LinkedIn lane

### Scripts

**Shell helpers (5):** `add-prospect.sh`, `build-list.sh`, `generate-messages.sh`, `log-outreach.sh`, `pipeline-status.sh` — likely thin wrappers / v1 generation tools. Operating directive references these by name.

**Python (9):**
- `state.py` — shared loader (load_prospects, load_log, append_log, SKIP_STATUSES). Core.
- `send_touch.py` + `send_touch_v2.py` — v2 is the live one (has cadence config, segment_label dict, render() with {{first_name}}/{{company}}/{{segment_label}}/{{your_name}} placeholders, gog subprocess, 2s sleep between sends)
- `discover_prospects.py` — Clutch scraper + Hunter.io enrichment, 50-lookup cap
- `daily_outreach.py` + `daily_outreach_v2.py` — v2 is current
- `linkedin_helper.py` + `generate_linkedin_tasks.py` — from the abandoned LinkedIn lane
- `triage_reply.py` — reply classification (positive/warm/weak/negative regex patterns), draft follow-up

**Error handling:** `send_touch_v2.py` wraps subprocess.run with timeout=30, capture_output=True, returns (ok, detail) tuple, appends `err` status on failure. Has `try/except: pass` around temp file unlink (acceptable). `try/except ValueError` around date parse (acceptable). ⚠️ The empty `except: pass` is Python anti-pattern but not a real risk here.

**Runnable:** All Python scripts have shebangs and are importable. Shell scripts are +x. state.py module pattern is correct.

---

## LAUNCH ASSETS

### Directory layout (`collectly/launch/`)

| Subdir/file | Purpose | Last touched |
|---|---|---|
| `launch-day-playbook.md` | 24-hour launch timeline | 2026-07-21 20:34 |
| `3-emails-to-send-now.md` | Supporter email batch (3) | 2026-07-21 20:34 |
| `supporter-email-monday.md` | Main supporter template | 2026-07-21 20:34 |
| `linkedin-post.txt` | Launch LinkedIn post copy | 2026-07-21 20:34 |
| `tweets/README.md` | 3 pre-staged tweets | 2026-07-21 20:34 |
| `capterra/SUBMIT.md` + `README.md` | Capterra listing | 2026-07-21 21:01 / 2026-07-14 |
| `g2/SUBMIT.md` + `README.md` | G2 listing | 2026-07-21 21:01 / 2026-07-14 |
| `hackernews/README.md` | HN post copy | 2026-07-21 21:01 |
| `producthunt/SUBMIT.md` + `README.md` | PH listing | 2026-07-21 21:01 / 2026-07-14 |
| `postmortem/TEMPLATE.md` | Post-launch postmortem template | 2026-07-21 20:34 |

**Purpose:** Product launch — Product Hunt, Hacker News, G2, Capterra, LinkedIn, Twitter, supporter email blast. All marketing/distribution, not technical launch. Clear and on-mission.

### Is launch "ready"?

**It already happened.** Today is 2026-07-23, launch was Wed 22 July 2026.

- `launch-day-playbook.md` still reads as future-tense ("T-24h", "T+0: 8:01 AM EAT — PH GO LIVE") — **needs to be archived or re-titled as historical runbook**
- `postmortem/` exists but only contains `TEMPLATE.md` — **no postmortem was actually written**
- The T+24h postmortem is the most-deliverable step in the playbook. If the launch did happen, there should be a `launch/postmortem/2026-07-23.md` (or similar) with:
  - PH upvotes/comments, final rank
  - HN upvotes/comments
  - Signups, conversion rate
  - First paid customer
  - Top 3 questions from comments
  - Bugs surfaced

### Gaps in launch assets

- **No `postmortem/` write-up** — most critical gap
- **No analytics dashboard / tracking doc** — playbook has a table for "PH Upvotes / Comments / HN Upvotes / Signups / Errors" but it's empty
- **Tweets are pre-staged as docs, not scheduled** — Buffer/Later via official API is in the permitted channels list, but nothing here shows a Buffer schedule
- **No Capterra/G2 form-fill status** — the SUBMIT.md files exist but there's no log of whether they've actually been submitted. README.md files in those dirs are 9 days old (14 July).

---

## DOCS HEALTH

### `README.md` ⚠️

- Last modified: 2026-07-13 (10 days stale)
- CI badge: points to `davidmugambi104/collectly/actions/workflows/ci.yml` — but DEPLOY.md says the GitHub repo **hasn't been created yet** (the fine-grained token doesn't have Administration: write). **The badge in README links to a 404.**
- Tech stack: Next.js 15, TypeScript strict, PGlite/Postgres, Clerk, Stripe, Resend, Twilio, OpenAI, PostHog, QBO, Xero — current
- Quick start, Architecture, Scripts, Env vars, Repo layout, Deploying — all present and accurate
- **Still says `STRIPE_SECRET_KEY` is required for prod billing** — but OPERATING-DIRECTIVE.md (2026-07-23) says Stripe Connect is no longer in the active integration path. **Docs contradiction.**
- Built by section: accurate

### `DEPLOY.md` ❌

- Last modified: 2026-07-13 (10 days stale)
- Title: "B2B SaaS Build Status" — still framed as build status, not deployment
- Says: "Live: http://localhost:3030" — this is a dev URL, not a production URL
- Has a "GitHub push — what Davie needs to do" section that walks through repo creation → push. **This is unblockable work, not a doc.**
- Says: "5 user-owned actions" still pending — this matches the MEMORY note that the launch is gated on 5 actions
- Production deploy steps missing. The `vercel.json` is in the repo (per README), but the actual deploy steps (Vercel project creation, env var set, domain config, Resend verify) aren't here.

### `CHANGELOG.md` ⚠️

- Last modified: 2026-07-13 (10 days stale)
- Has one entry: "## 2026-07-13 — Initial public build (17 commits, day 1)"
- **10 days of work is unaccounted for**: outreach pipeline build, 30-prospect list, 6 message templates, 9 python scripts, launch assets, 3-emails-to-send-now.md, supporter-email-monday.md, tweets, HN/PH/G2/Capterra submission docs, postmortem template
- Needs new entries for 14 July (ops docs), 15 July (launch plan / strategy), 19-20 July (outreach pipeline), 21 July (launch assets), 22-23 July (launch + outreach sends)

### `github.md` (root)

- 108 bytes — likely a pointer or one-liner. Not opened (low priority).

### `outreach/README.md` ✅

- 2980 bytes, last modified 2026-07-14. Skim-not-read.

---

## CI STATUS

### `.github/workflows/ci.yml` ✅

- File exists, well-structured
- **4 jobs:**
  1. `check` — `tsc --noEmit` + `next lint --quiet` (warn-only)
  2. `build` — full `next build` with stub env vars; uploads `.next` artifact
  3. `db` — real Postgres service, `drizzle-kit push`, smoke query
  4. `secrets` — gitleaks
- Concurrency control: `cancel-in-progress: true` per ref — good
- Pinned to `ubuntu-latest`, node 22, action v4
- Uses `USE_PGLITE=1` and `USE_DEV_AUTH=1` in build to avoid hard DB/Clerk dependency — sensible
- **Cannot verify green status from this audit** (no GitHub API access). The README badge would 404 until the repo is created.

### Risk

- `next lint --quiet || true` is warn-only — explicitly flagged in the workflow as "tighten later". Reasonable for v1.
- No test job. App code is not tested (out of scope per audit, but noting).
- No deploy job. CI builds but doesn't deploy. Manual `vercel --prod` per README.

---

## OPS

### `collectly/ops/` — 8 files, all dated 2026-07-13 to 2026-07-15

- `cold-outbound.md` (5647B, 13 Jul)
- `customer-interviews.md` (4066B, 13 Jul)
- `founder-content.md` (5260B, 13 Jul)
- `g2-capterra-listings.md` (4454B, 13 Jul)
- `launch-plan.md` (6194B, 15 Jul)
- `product-hunt.md` (3736B, 13 Jul)
- `setup-keys.md` (10293B, 15 Jul) — credential setup guide
- `strategy.md` (4645B, 15 Jul)

These look like the strategy/planning docs the operating framework references. Last touched 15 July. Aligns with the launch plan timeline. No audit-level concerns from the file listing.

---

## CONSISTENCY: `memory/OPERATING-DIRECTIVE.md` vs reality

### ✅ Consistent

- 30 prospects in `data/prospects.csv` ✅
- 3 approved templates listed: `t1-cold.md`, `t2-followup.md`, `t3-final.md` ✅
- `outreach/data/outreach-log.csv` referenced as the log ✅
- `outreach/scripts/*.sh` listed: `add-prospect, build-list, generate-messages, log-outreach, pipeline-status` — **all 5 exist** ✅
- Linked references to `OPERATING-FRAMEWORK.md` and `2026-07-19-autonomy-execution.md` — both exist ✅
- "Email is primary lane" reroute decision reflected in `queue/linkedin-tasks.md` (0 LinkedIn tasks) ✅
- ICP mix (US/UK agencies) matches CSV ✅

### ⚠️ Drift / minor inconsistencies

1. **3 templates vs 6 files.** Directive names 3; repo has 6 with a deprecation ladder (v1 → v2 → v3 variants, plus t4). The newer files (t1-cold-v2, t1-cold-v3) are explicitly documented as replacements but not noted in the directive. Update the directive's "approved template set" line to reflect the deprecation.
2. **3 touches vs 4 touches.** Directive says "max 3 touches". `t4-close.md` and `send_touch_v2.py` implement a 4th touch at day 14. Pick one and align both.
3. **"3-5 day spacing"** — t2=3d, t3=7d. The 7d gap is wider than the spec; either tighten the script or relax the spec.
4. **CSV column reference in directive.** The directive says the log has "prospect, status, last_contact, next_step" — actual columns are `id, email, touch, sent_at, replied_at, status, next_step, message_id, detail, segment`. Close but not identical. The directive is descriptive, not authoritative on schema — minor.

### ❌ No contradiction found

- Stripe decision (2026-07-23): not in directive, but in OPERATING-DIRECTIVE.md addendum. **README.md still says Stripe is required for prod billing** — that's the docs contradiction noted above.

---

## FIXES NEEDED (priority order)

### 🔴 P0 — Launch completeness (do today)

1. **Write the postmortem** at `launch/postmortem/2026-07-23.md` (or rename to the actual date). The launch-day-playbook has a T+24h checklist at 8:01 AM EAT 23 July. Use `postmortem/TEMPLATE.md` as the scaffold. This is the single most-overdue deliverable.
2. **Fill in the launch metrics table** (PH/HN/signups/errors) — even if some cells are 0, having the receipts matters.
3. **Fix the duplicate P006 row in `outreach-log.csv`** — either dedup or merge. Any script that loads this log will see P006 twice.

### 🟠 P1 — Compliance / risk

4. **Add unsubscribe footer (or List-Unsubscribe header) to all 6 message templates.** Operating directive explicitly calls this out. CAN-SPAM / UK PECR / AU Spam Act — real legal risk. Configure in Resend.
5. **Decide 3-touch vs 4-touch** cadence. Update either `t4-close.md` to be a "if needed" extension, or update the operating directive to "4 touches, 14-day max."
6. **Decide on Stripe in README.md.** Either remove Stripe from the "Required for prod billing" row in the env table, or add a note that Stripe Connect is parked (links to the operating directive's decision). Current state misleads.

### 🟡 P2 — Doc freshness

7. **Update CHANGELOG.md** with entries for 14-23 July (ops docs, outreach pipeline, launch assets, outreach sends, launch). 10 days of work is undocumented.
8. **Update README.md CI badge** — either create the GitHub repo (per DEPLOY.md step) and let the badge resolve, or remove the badge until it does.
9. **Rewrite DEPLOY.md** as an actual deploy runbook, not a build-status update. Cover Vercel project creation, env var setup, Resend domain verify, Postgres provisioning, smoke test, custom domain.
10. **Update operating directive** to reference v2/v3 templates explicitly and the 4-touch (or 3-touch) decision.

### 🟢 P3 — Hygiene

11. **Fill `next_step` in outreach-log.csv** for all 30 sent rows based on cadence (t2 due 3 days after t1, etc.). Trivial, makes `pipeline-status.sh` more useful.
12. **Add real hooks to tier-1 prospects** (P001, P002, P004, P008, P009 are the Tuesday batch). 2-min pre-send check per `TIER-1-SHORTLIST.md` would add 1-2 hooks. Increases reply rate per v2's own rubric.
13. **Fix the "12 prospects in tier 2" line in `t1-cold-v3-industry-variants.md`** — the 12 is total branding, not tier-2.
14. **Decide on David vs Davie vs David Mugambi** in template sign-offs. Currently inconsistent: emails use "David", LinkedIn uses "Davie Mugambi, founder @ Collectly", 3-emails-to-send-now.md uses "Davie Mugambi". Pick one.
15. **Subject case in t4-close.md** — `closing the loop` is sentence-case; the others are sentence-case too. Consistent, just verifying it was intentional.

### ⚪ P4 — Out of scope for outreach/launch audit

- App code (out of scope per directive)
- Tests (CI has no test job; not asked about)
- `memory/` files (just the directive was in scope; not audited)
- `.env.local` / `.creds` / `.cron_secret.txt` (secret hygiene is its own audit)

---

## Appendix: counts at a glance

- Prospects: **30** ✅
- Approved templates: **3** in directive, **6** files in repo (v1 + v2 + v3 + t2 + t3 + t4)
- Log rows: **31** (30 sent + 1 DNC; 1 duplicate id P006)
- Outreach scripts: **14** (5 shell + 9 python)
- Launch assets: **12** files across 6 subdirs
- Postmortem files: **1** (template only, no actual postmortem)
- CI jobs: **4** (check, build, db, secrets)
- Doc files needing update: **3** (README, DEPLOY, CHANGELOG — all 10 days stale)
- Compliance gaps: **1** (no unsubscribe footer in templates)

**End of audit.**
