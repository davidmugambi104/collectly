# Collectly Outreach — Lead-Gen Setup

**Goal:** reach 5,000 cold emails/month with verified contacts, run from this workspace.

This is the operational guide for the lead-gen stack. Read it once, then refer back when adding keys, debugging, or scaling.

---

## What's wired up

| Tool | Role | Status |
|---|---|---|
| **Hunter.io** | Email finder + verifier (primary) | ✅ already configured |
| **Apollo.io** | Bulk prospect discovery (workhorse) | ⏳ needs `APOLLO_API_KEY` |
| **Skrapp.io** | Email finder + verifier (backup to Hunter) | ⏳ needs `SKRAPP_API_KEY` |
| **Resend** | Send emails | ✅ already configured |
| **Trembi** | Africa-focused (not used — ICP is US/UK) | ⏸ deferred |
| **ZoomInfo** | Enterprise firmographic ($$$) | ⏸ skipped |

---

## What to drop in

Create these files (one per key, just the key text, no quotes, no newlines):

```
/home/davie/.openclaw/secrets/collectly/HUNTER_API_KEY    # already exists
/home/davie/.openclaw/secrets/collectly/APOLLO_API_KEY    # ← drop in
/home/davie/.openclaw/secrets/collectly/SKRAPP_API_KEY    # ← drop in
/home/davie/.openclaw/secrets/collectly/RESEND_API_KEY    # already exists
```

`.env.local` is read by `daily_send.py` for `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. The other keys are read from the secrets dir.

**Format reminder:** each file is a single line, the key string only. Example for a new Apollo key:
```
echo "your-apollo-key-here" > /home/davie/.openclaw/secrets/collectly/APOLLO_API_KEY
chmod 600 /home/davie/.openclaw/secrets/collectly/APOLLO_API_KEY
```

---

## What runs where

```
[Raw source]            [Enrich]              [Verify]           [Send]
Clutch/LinkedIn/  →   Apollo.io      →  →   Skrapp or Hunter →  Resend
IndieHackers/           (firmographic +
Google Maps             email at scale)

[Scripts that wire this up]
collectly/outreach/scripts/
  clients/__init__.py      ← base HTTP client (rate limit, retry, User-Agent)
  clients/hunter.py        ← Hunter client
  clients/apollo.py        ← Apollo client
  clients/skrapp.py        ← Skrapp client
  enrich_pipeline.py       ← Apollo search → enrich → verify → append to prospects.csv
  daily_send.py            ← pick tier → render template → send via Resend → log
```

---

## How to use

### 1. Check what's wired up

```bash
cd /home/davie/.openclaw/workspace/collectly
python3 outreach/scripts/enrich_pipeline.py status
```

Output: which secrets are present, how many rows in `prospects.csv`, breakdown by industry.

### 2. Run a search to add new prospects

```bash
# Example: 30 US/UK founders/CEOs at 5-50 person companies
python3 outreach/scripts/enrich_pipeline.py search \
  --titles "Founder" "CEO" "Owner" \
  --geo "United States" "United Kingdom" \
  --size "5,10" "11,20" "21,50" \
  --industry-label "branding" \
  --tag "branding_us_uk" \
  --max-add 30
```

This:
1. Calls Apollo `people_search` (0 credits)
2. For each result, calls Apollo `people_enrichment` (1 credit each)
3. Verifies the email via Hunter (1 credit) or Skrapp (1 credit)
4. Appends verified records to `prospects.csv` (skips duplicates by domain)

**Free-tier budget (Apollo free ~70 credits/mo, Hunter 50/mo):**
- 1 run = ~30 enrichments + 30 verifies = ~60 credits
- Run **once a month on free tier** to stay under the cap
- If you need more: Resend Pro $20/mo for send volume, Anymailfinder $19/mo for cheap bulk verification

### 3. Run the daily send

```bash
# Tier 1: handpicked, 5/day
python3 outreach/scripts/daily_send.py --tier 1 --limit 5

# Tier 2: segmented, 20/day
python3 outreach/scripts/daily_send.py --tier 2 --limit 20

# Tier 3: bulk, ramp with domain warmup
python3 outreach/scripts/daily_send.py --tier 3 --limit 100
```

The script:
1. Loads `prospects.csv` filtered to the tier
2. Skips anyone sent in the last 14 days (cooldown)
3. Renders the v3 industry-variant template per prospect
4. Sends via Resend
5. Logs to `outreach-log.csv` with the Resend message_id
6. Saves a JSON of the full result to `outreach/logs/send-<ts>.json`

**Add `--dry-run` to preview without sending.**

### 4. Check pipeline status

```bash
bash outreach/scripts/pipeline-status.sh
```

Shows: contacts made, replies, follow-ups due, last 10 log entries.

---

## Volume math (for 5,000/month target)

| Stage | Free tier limit | Paid tier |
|---|---|---|
| Apollo enrichment | ~70/mo | 10k credits Starter $49/mo |
| Hunter verify | 50/mo | 2k credits Starter $49/mo |
| Skrapp verify | 50/mo | 2k credits Pro $29/mo |
| Resend send | 3,000/mo (100/day) | 50k/mo Pro $20/mo |

**To hit 5,000 verified + 5,000 sent in a month, you need:**

| Item | Cost | What it unlocks |
|---|---|---|
| Resend Pro | $20/mo | 50k sends, no daily cap |
| Anymailfinder 4.8k credits/yr | $19/mo equiv | ~400 verified/mo at $0.05/lead |
| **Total** | **~$39/mo** | ~400 verified + 5,000 sent capacity |

For 5,000 **verified** in a month, the budget goes to ~$119/mo (Anymailfinder 60k credits/yr = $99/mo).

The current "free stack" gets you ~400 verified leads/mo + 3,000 sends/mo. That's enough to test the funnel at scale (10× current volume) for $0 before deciding whether to spend.

---

## Warm-up schedule (critical for tier 3 bulk)

`getcollectly.app` has sent ~35 emails total. Going from 35 → 5,000 in 30 days burns the domain reputation. The fix:

| Day | Daily send cap | Cumulative |
|---|---|---|
| 1-3 | 20 | 60 |
| 4-7 | 30 | 180 |
| 8-14 | 50 | 530 |
| 15-21 | 80 | 1,090 |
| 22-30 | 150 | 2,440 |
| Day 31+ | 167+ | 5,000+ |

`daily_send.py --limit N` is your knob. Don't exceed these numbers until you see consistent inbox placement (check Resend's bounce/complaint dashboard).

---

## Reply triage

When replies land, use the existing `outreach/scripts/triage_reply.py`. The v2 shortlist defines "positive reply" — see `outreach/messages/t1-cold-v2.md`.

After triage, log the outcome to `outreach-log.csv` (status = `replied_positive`, `replied_not_interested`, `replied_unsubscribe`, etc.).

---

## What changed today (2026-07-23)

- Added 4 client modules under `outreach/scripts/clients/`
- Added `enrich_pipeline.py` (Apollo search → enrich → verify → append)
- Added `daily_send.py` (pick → render → send → log)
- Sent the 5 Send-2 emails via Resend (P019, P023, P026, P027, P029)
- Re-send logging: 5 new t1 rows appended to `outreach-log.csv` with `detail = v3_resend`

## What to do next

1. **Drop in `APOLLO_API_KEY`** and `SKRAPP_API_KEY` (if you want it as backup)
2. **Run `enrich_pipeline.py status`** to confirm wiring
3. **Test the Apollo search** with a small `--max-add 5` run before going to 30
4. **Tomorrow (Thu 24 July 09:00 EAT):** read replies from the 10 tier-1 sends. If 0/10, switch the opener. If 2+/10, lock it in and start scaling tier 2/3.
5. **Next week:** run `enrich_pipeline.py search` to add 30-50 fresh tier-3 leads
