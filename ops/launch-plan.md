# Launch Plan — Collectly

**Owner:** Davie
**Generated:** 2026-07-15 16:15 EAT
**Target launch:** Wednesday, 22 July 2026, 12:01 AM PT / 8:01 AM EAT

---

## Recommended launch date: **Wed 22 July 2026**

### Why Wednesday

- **PH traffic pattern:** Tue is good, Wed is best, Thu is decay. Memory confirms this is in your plan.
- **Same-day HN:** HN launches 8-10 AM ET (3-10 PM EAT) on Wed. You can ride two waves simultaneously. Your reply window is 4 hours; that's the prime PH engagement window.
- **1 week runway:** long enough to ship the must-haves, short enough to keep urgency.
- **Pair with your own network:** Monday 20 July = soft launch to 5-10 people in your network, get their upvotes ready for 12:01 AM PT Wednesday.

---

## What "launch-ready" means

For Wed 22 July, the product must:

1. **Be reachable at a real domain** (not `vercel.app`)
2. **Allow a real sign-up** (Clerk, not the dev shim)
3. **Take real money** (Stripe live, not test)
4. **Send a real welcome email** (Resend with verified domain)
5. **Show the dashboard with their real data** (QBO or Xero OAuth)
6. **Not crash on a phone** (responsive, no console errors)

The PH listing draft is done. The HN draft is done. G2 + Capterra are done. The screenshots are done. **Five things stand between today and a successful launch.**

---

## Critical Path — what must be true by 22 July

| Day | Owner | Task | Why it blocks |
|---|---|---|---|
| **Today (Wed 15)** | Davie + Me | Buy domain `collectly.app` (or fallback). Sign up for PH maker account. Submit the listing draft. | Domain is 1 hour, PH review takes 24-48h |
| **Today** | Me | Fix the CI build — remove `pk_test_ci` placeholder key so ClerkProvider doesn't crash. Push to main. | CI currently red. Bad optics for a launch-day build. |
| **Today** | Me | Confirm production deploys the current commit to `collectly.app` once domain is wired. |  |
| **Thu 16** | Davie | Stripe live keys. Production Clerk instance. Resend domain verification. | Without these, the first visitor can't sign up or pay. |
| **Thu 16** | Me | Run end-to-end on real Stripe test card. Confirm dunning sends real email. | Catches the "works in dev, breaks in prod" class of bugs. |
| **Fri 17** | Davie | Open https://collectly.app on your phone. Click every CTA. | The demo you showed me is not the demo a stranger will see. |
| **Fri 17** | Me | Wire up PostHog with real API key. Track: homepage view, sign-up start, sign-up complete, first invoice sync, dunning send, payment. | Without analytics, launch is a black box. |
| **Sat 18** | Buffer | Fix anything broken from Friday's test. | Surfaces always appear on launch day. |
| **Sun 19** | Davie | Get sleep. Pre-write your first 10 HN comments. | HN requires real-time engagement. No time to think on launch day. |
| **Mon 20** | Davie | Soft launch to 5-10 people in your network. Show them the product. Ask for honest reactions. Get 3-5 committed upvotes for 12:01 AM PT. | Top 5 upvotes in 30 mins is the difference between #1 and #4 of the day. |
| **Tue 21** | Davie | Rest. Set alarms. Pre-stage tweets ("We just launched..."). Charge your phone. |  |
| **Wed 22 (LAUNCH)** | Davie + Me | 12:01 AM PT = 8:01 AM EAT — go live. Monitor for 8 hours. I watch the logs and fix anything that breaks. HN post at 8 AM ET = 5 PM EAT. |  |

---

## What I will NOT do (and why)

- **No new features** between now and launch. Nothing.
- **No new OAuth integrations** unless they exist as a clear blocker for a real customer.
- **No refactoring.** The code works. The bugs are in scope of "not in this launch." We fix them after.
- **No new design.** The screenshots and copy are good. Don't change them 6 days out.

The job between now and launch is **fix what's broken, not build what's missing.**

---

## Decision points where you need to choose

1. **Domain.** `collectly.app`? If taken, `getcollectly.com`? `trycollectly.com`? (Today, before PH maker account.)
2. **Launch day confirmation.** Wed 22 July, or push to Wed 29 July? (Today.)
3. **HN same-day as PH, or 2 days later?** I recommend same-day. The combined effect is bigger, but the workload is brutal. (Today.)
4. **Solo launch vs. with co-hunters.** If you have 2-3 people willing to commit to upvotes at 12:01 AM PT, your launch ranks higher. (Ask today.)

---

## Risks I see

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe live keys delayed | Medium | Critical | Use Stripe test mode for launch, swap to live day 1. PH visitors won't notice if marketing says "test mode" honestly. |
| Domain acquisition blocked | Low | Critical | Have 2 backups ready (`getcollectly.com`, `trycollectly.com`). |
| HN post gets buried | High | Medium | Comment actively for 4 hours. Pre-write good comments. Reply to every comment. |
| Dunning breaks on first send | Medium | High | Test Thu 16 with real Resend. |
| Sign-up rate < 5% | Medium | Medium | Have your network soft-launch Monday. Add 5-10 signups before Wed so the listing has social proof. |
| First customer is your worst | High | Medium | Be ready to give hands-on support. The first 10 customers should get a personal onboarding call. |

---

## What you need to give me to start Step 1

1. **Confirm the launch date: Wed 22 July?** If not, tell me when.
2. **Domain choice.** `collectly.app` if available; otherwise your backup.
3. **Your 5-10 launch supporters** — names + how to reach them.

Once I have those, I'll write the day-by-day checklist, the pre-launch email to your supporters, the on-day monitoring script, and the post-launch retro template.

---

## What I need from you RIGHT NOW (5 minutes)

Decide on:
- [ ] Launch date: Wed 22 July (yes / push to 29 / no)
- [ ] Domain: collectly.app (or your backup)
- [ ] Are you doing this solo or with supporters?

Once you answer, I move to Step 2 (verify launch copy is launch-ready with those answers) and start shipping the day-by-day work.
