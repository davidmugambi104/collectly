# Collectly Launch Post-Mortem — Wed 22 July 2026

> **Why this exists**: You'll be exhausted Wed night. This template collects
> the data while it's still fresh. Fill in the boxes Thu morning before
> your memory gets foggy. 20 minutes of typing now saves 3 hours of "wait
> what was that number again" later.
>
> **When to fill it in**: Thu 23 July 8-10 AM EAT (T+24-26h after launch).
> Coffee first. Then this.
>
> **Audience**: Yourself in 6 months when you launch the next thing. Be
> brutally honest. The wins are nice to remember; the failures are where
> the learning lives.

---

## 0. TL;DR (write this LAST)

**The launch, in 2 sentences:**

> [One sentence on what happened — e.g. "Top 8 on Product Hunt, 312 signups
> in 24h, $1,200 MRR by Friday."]
>
> [One sentence on the biggest lesson — e.g. "We over-invested in the PH
> listing and under-invested in the on-boarding flow; 60% of signups
> bounced at the OAuth step."]

---

## 1. The Numbers (the data Davie cares about)

### 1.1 Top-of-funnel (by Wed 22 23:59 PT / Thu 23 9 AM EAT)

| Channel                | Visits  | Signups | Conversion |
|------------------------|---------|---------|------------|
| Product Hunt           | _____   | _____   | _____%     |
| Hacker News            | _____   | _____   | _____%     |
| collectly.app direct   | _____   | _____   | _____%     |
| collectly.vercel.app   | _____   | _____   | _____%     |
| LinkedIn post          | _____   | _____   | _____%     |
| Twitter                | _____   | _____   | _____%     |
| G2 listing             | _____   | _____   | _____%     |
| Capterra listing       | _____   | _____   | _____%     |
| Other: ___________     | _____   | _____   | _____%     |
| **TOTAL**              | _____   | _____   | _____%     |

> How to fill this: Google Analytics / Vercel Analytics / Plausible export
> for the 24h window. Pull the referrer breakdown. Count signups in PGlite
> or the production DB.

### 1.2 Conversion funnel (Wed 22 → Sun 26)

| Step                                  | Count  | Drop-off |
|---------------------------------------|--------|----------|
| Visited site                          | _____  | —        |
| Clicked "Start free trial"            | _____  | _____%   |
| Created account                       | _____  | _____%   |
| Connected QBO or Xero                 | _____  | _____%   |
| Created first invoice                 | _____  | _____%   |
| Sent first dunning message            | _____  | _____%   |
| **Day-7 retained** (came back)        | _____  | _____%   |

> The QBO connection step is where I'd expect the biggest drop. If it's
> over 70%, that's a huge problem worth fixing before the next launch.
> If it's under 40%, QBO is probably broken or the docs are unclear.

### 1.3 Revenue impact (by Sun 26 EOD)

| Metric                                | Count  |
|---------------------------------------|--------|
| Free trials started                   | _____  |
| Converted to paid                     | _____  |
| New MRR                               | $_____ |
| New customers (count)                 | _____  |
| Total A/R under management (cumulative) | $_____ |
| Largest single invoice processed      | $_____ |

---

## 2. What Worked

> The things that paid off. Be specific. "The launch was good" is
> useless. "Product Hunt #8 for 6 hours drove 2,100 visits in 90 minutes"
> is useful.

- **What specifically worked:** ___________________________________________
- **Why it worked (your theory):** ________________________________________
- **Evidence (numbers, screenshots, quotes):** ____________________________

(repeat for 2-4 more wins)

---

## 3. What Didn't Work

> The things you'd change. Same standard as above: be specific.

- **What specifically didn't work:** _______________________________________
- **Why it failed (your theory):** ________________________________________
- **What you'd do differently:** __________________________________________
- **Cost of the failure (hours, signups, money):** _________________________

(repeat for 2-4 more failures)

---

## 4. The Surprises

> Things you didn't predict. Most learning lives here.

- **Surprise:** ____________________________________________________________
- **Was it good or bad?** _________________________________________________
- **Did you capitalize on it (if good) or recover from it (if bad)?** _______

(repeat for 2-3 more surprises)

---

## 5. Operational Health

> The things that should have worked but might not have. Important because
> this is what causes burnout if left unaddressed.

- **Resend domain verified before launch?** YES / NO (if no, who did it when?)
- **Stripe live key configured?** YES / NO (if no, what broke?)
- **Vercel deploy successful?** YES / NO (if no, what fallback did we use?)
- **Dunning cron actually ran on launch day?** YES / NO (check `dunning_runs`)
- **Healthcheck cron passed at every 15-min check?** YES / NO (check logs)
- **No customer-reported P1 bugs in first 4 hours?** YES / NO
- **Support inbox reachable?** YES / NO (test: hello@collectly.app)
- **Errors visible without a paid Sentry?** YES / NO (check `dev/errors.log`)

### If any are NO, why?

> ________________________________________________________________________

---

## 6. Personal & Team

> Most post-mortems skip this. Don't. Launch week is hard on the humans.

- **Hours worked Mon-Sun:** _____
- **Hours slept avg:** _____
- **Days you took off:** _____
- **When did the dopamine peak?** ________________
- **When did the dip hit?** ________________
- **Did you celebrate?** YES / NO
- **What did you learn about yourself?** ________________________________

---

## 7. The 3 Things to Do DIFFERENTLY Next Time

> Compress the lessons into actionable changes. Future-you will thank
> present-you.

1. ________________________________________________________________________
2. ________________________________________________________________________
3. ________________________________________________________________________

---

## 8. The 3 Things to KEEP Doing

> The patterns that worked and should become defaults.

1. ________________________________________________________________________
2. ________________________________________________________________________
3. ________________________________________________________________________

---

## 9. The Decision Log (for the next product)

> When you launch the next thing (v2, or a new product), these are the
> data points to revisit.

- **Was the prep time (4 weeks) too long, too short, or right?**
  _______________
- **Was the launch surface (PH + HN + G2 + LinkedIn) too broad, too
  narrow, or right?** _______________
- **Was the pricing right for the launch? (Trial: free for 14d → $49/mo
  starter / $149/mo growth / custom scale)** _______________
- **Should we have launched earlier with less polish?** _______________
- **Should we have waited longer for more polish?** _______________

---

## 10. Free-form (anything else)

> ________________________________________________________________________
> ________________________________________________________________________
> ________________________________________________________________________

---

## Appendix: Data Sources (fill in as you go)

> Pin the URLs/paths so the next post-mortem is easier.

- Vercel Analytics: ________________________
- Plausible: _______________________________
- Product Hunt dashboard: __________________
- HN front page thread: ____________________
- Stripe dashboard: ________________________
- Resend logs: _____________________________
- GitHub commit count (Wed 22): ____________
- Slack/Discord launch channel: _____________

---

> **Final tip**: Save this filled-in document to `launch/postmortem/2026-07-22.md`
> and reference it in your next launch's pre-mortem (3 weeks before the
> next launch, re-read this).
