# Collectly: 7-Day Compressed Validation Sprint

Use this when you want to run the three diagnostic tracks in parallel instead of sequentially. Designed for a solo founder with limited time and $0 budget.

---

## Principle

Don't wait 30 days. Run independent tracks simultaneously and force a hard checkpoint on day 7. The goal is speed of signal, not volume of outreach.

## Tracks (run all starting today)

### Track 1 — Deliverability (fix today, ~15 min)
- Check SPF / DKIM / DMARC for `getcollectly.app` and the sending domain in Resend.
- Use mail-tester.com or a similar tool to send a test email and score it.
- Fix any DNS records before Track 3 sends another batch.
- **Binary outcome:** fixed or not fixed. Should be resolved day 1.

### Track 2 — Bookkeeper channel (start today, finish outreach in 48 hours)
- Find 10 fractional bookkeepers / controllers on LinkedIn who list agencies or creative/marketing services as a specialty.
- Send one concise LinkedIn DM offering a free "AR health check" for one of their agency clients in exchange for feedback.
- Ask directly whether they would recommend a tool like Collectly to their clients once they see it.
- **Threshold:** ≥2 unprompted "yes" out of 10 = lean into this channel. 0–1 = reassess product urgency.
- Keep message fixed for the full 10. No mid-batch tweaks.

### Track 3 — Niche message test (start today, finish in 48 hours)
- Build a list of 30 local-service marketing agencies (SEO / PPC / web design serving trades/healthcare), 10–25 employees.
- Split into email + LinkedIn where possible:
  - 15–20 cold emails
  - 10–15 LinkedIn warm DMs (comment on 2–3 posts first, then connect, then DM)
- Use a yes/no low-friction CTA: "Worth a 2-min Loom?"
- **Threshold:** ≥3 qualified conversations out of 30–60 total touches means the niche and message are workable. <3 after deliverability is fixed means the niche is wrong.
- Decide the message Monday morning, send it all, do not touch it until responses are in.

## Daily rhythm

| Day | Actions |
|---|---|
| 1 (today) | Fix deliverability. Send all 10 bookkeeper DMs. Send first half of niche batch. |
| 2 | Send second half of niche batch. Follow up any same-day bookkeeper replies. |
| 3–4 | Passive response window. Do not tweak messages. Log replies as they arrive. |
| 5 | Send one polite follow-up to non-responders in niche batch (only if you have not already sent one). |
| 6–7 | Final response window. Prepare checkpoint review. |
| 7 | **Hard checkpoint** — see below. |

## Day-7 checkpoint (force a decision)

Review exactly three numbers:

1. **Deliverability:** fixed / not fixed (binary)
2. **Bookkeeper track:** X/10 unprompted yes
3. **Niche track:** X qualified conversations / total touches

### Decision rules
- **≥2/10 bookkeepers say yes** → prioritize bookkeeper/partner channel. Build a lightweight partner/referral motion immediately.
- **≥3 qualified conversations in niche** → the wedge is plausible. Double down on the winning message/channel.
- **0/10 bookkeepers yes AND <3 niche conversations** → the product-urgency assumption is likely wrong. Stop outreach, return to problem discovery (interviews, not pitches).
- **Deliverability not fixed AND niche is silent** → you cannot conclude anything about message or niche until deliverability is fixed. Fix it, then rerun Track 3 only.

## Guardrails

- **No mid-batch message changes.** If early replies feel discouraging, log the feeling but keep the test clean.
- **No new channels during the 7 days.** Resist the temptation to add Twitter, Reddit, or communities mid-sprint — they dilute signal.
- **Track conversations, not opens or clicks.** A "qualified conversation" is a real back-and-forth about how they handle AR today. "Sounds cool" does not count.
- **Log everything in `outreach/data/outreach-log.csv` or a parallel sprint sheet.** Source, channel, message variant, response, next step.

## Why this works

Sequential testing burns the full 30-day runway waiting. Parallel testing gives you decisive signal in 5–7 days. The 30-day window is a ceiling, not a target — if the evidence is unambiguous by day 7, act on it.
