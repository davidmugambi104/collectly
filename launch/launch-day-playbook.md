# Launch Day Playbook — Wed 22 July 2026

**Time zone note:** PT = Pacific Time (US West). EAT = East Africa Time. ET = Eastern Time.
8:01 AM EAT = 12:01 AM PT = 3:01 AM ET.

**Cast:**
- Davie: on the keyboard, replying to comments, posting on socials
- Me (assistant): watching logs, fixing things that break, refreshing dashboards

---

## T-24h: Tue 21 July 8 PM ET (Wed 22 2 AM EAT)

### Davie
- [ ] Send the "go time" email to your 5-10 supporters
  (template in `supporter-email-monday.md`)
- [ ] Confirm phone is charged, alarms set
- [ ] Pre-stage 3 tweets for Wed (early / mid / late)
  - **Full copy is already pre-written in `tweets/README.md` — paste
    from there at the times below.**
  - Early (8 AM EAT): "We're live on Product Hunt → link"
  - Mid (12 PM EAT): "8 hours in — N signups, M upvotes" (with screenshot)
  - Late (8 PM EAT): "Just crossed N signups. Recap thread incoming"
- [ ] Charge devices, prep snacks

### Me
- [ ] Verify production build still serves correctly at getcollectly.app
- [ ] Confirm all 24 routes 200 OK
- [ ] Confirm Resend domain is verified (emails go out, not bounce)
- [ ] Confirm Stripe live keys are wired (test a $1 charge with your own card)
- [ ] Confirm Clerk auth works (sign in → dashboard)
- [ ] Confirm PostHog is receiving events (sign in event shows up)
- [ ] Set up log tail in a separate pane (vercel logs --follow, or the
  Vercel dashboard "Logs" tab)
- [ ] Pin a "Launch day health check" doc with the 6 things to monitor

---

## T-0: Wed 22 July 12:01 AM PT (8:01 AM EAT) — PH GO LIVE

### Davie (8:01 AM EAT)
- [ ] Post the PH listing (or confirm it's auto-scheduled for this time)
- [ ] Within 30 min: post the maker comment (full text in producthunt/SUBMIT.md)
- [ ] Pin the launch tweet to your Twitter profile
- [ ] LinkedIn post with the dashboard screenshot + PH link
- [ ] Text 3 people: "we're live, link's below"

### Me (8:01 AM EAT)
- [ ] Watch Vercel logs for the first 30 minutes
- [ ] Tail Resend logs: are emails being sent? Are they landing in inboxes?
- [ ] Watch the PH page: any early comments?
- [ ] PostHog check: sign-up event firing?

**First 30 min is critical.** If something crashes, you want to know NOW,
not 4 hours later when 50 people have bounced.

---

## T+30min: 8:31 AM EAT — First Comment Push

### Davie
- [ ] Reply to every comment on PH (target: <10 min response time)
- [ ] DM the first 5 commenters: "thanks for the support, here's the Pro code"
- [ ] Start a simple spreadsheet: time, comment, my response, follow-up needed

### Me
- [ ] Check Stripe for any failed payments (likely none, but watch)
- [ ] Check error rate on /api routes (any 500s = critical)
- [ ] Check the cron job for dunning (should fire at 9 AM EAT)

---

## T+2h: 10:01 AM EAT — Pre-Tweet

### Davie
- [ ] Mid-launch tweet: "X hours in, Y signups, Z upvotes. Here's what I
  learned today" (with screenshot of dashboard)
- [ ] Email the waitlist: "We're live on PH" (1 paragraph + PH link)
- [ ] Post in Indie Hackers: "just launched on PH, AMA about the build"
- [ ] Reply to every comment (still — don't stop)

### Me
- [ ] Generate the launch dashboard screenshot for the tweet
- [ ] Verify the email went out to the waitlist (check Resend dashboard)
- [ ] Check for any patterns in error logs (if 3+ users hit the same error,
  it's a bug — file it)

---

## T+5h: 1:01 PM EAT (5:01 AM ET) — Pre-HN

### Davie
- [ ] Final check: PH comment count, upvote count, any questions you haven't answered
- [ ] Take a break. Eat. Hydrate. The next 8 hours are the marathon.
- [ ] Pre-write 3-4 thoughtful comments on competitor HN threads (Chaser, Versapay,
  BILL). HN upweights users who participate in the community.

### Me
- [ ] If PH is at Top 5 of the day by 1 PM EAT: great, lean into it
- [ ] If PH is below Top 10: don't panic, this is normal for B2B launches
- [ ] Compile the "so far" stats for the HN post: upvotes, comments, signups

---

## T+8h: 4:01 PM EAT (8:01 AM ET) — HN GO LIVE

### Davie (post the HN at exactly 8:00 AM ET)
- [ ] Submit HN post (full body in hackernews/README.md)
- [ ] Within 30 min: reply to the first 3-5 comments
- [ ] Cross-link HN from PH and vice versa (HN comments will find PH, just
  acknowledge it)

### Me
- [ ] Watch the PH upvote rate drop slightly when HN launches (normal — users split attention)
- [ ] Watch the HN comment thread for any common questions (might reveal bugs)
- [ ] Monitor for any production issues (a viral HN can spike traffic 50-100x)

**If HN hits front page (rare but possible):**
- Davie: stay online for 2-3 hours, reply to everything
- Me: be ready to scale Vercel (Vercel auto-scales, but check the metrics)

**If HN dies after 2 hours:**
- Davie: don't be discouraged. Most Show HN posts don't hit the front page.
  The post lives forever as a reference.
- Move on to the email blast (Wed night) and Thursday morning's post-launch recap.

---

## T+12h: 8:01 PM EAT (12:01 PM ET) — Mid-Day Check

### Davie
- [ ] Post the late-day tweet: "12 hours in: N upvotes on PH, M on HN, K signups"
- [ ] Reply to any remaining comments
- [ ] Note the top 3 questions that came up — these become the
  next-2-weeks content ideas
- [ ] Hydrate. Eat real food. You've been going 12 hours.

### Me
- [ ] Generate the end-of-day report:
  - PH: upvotes, comments, signups
  - HN: upvotes, comments
  - Indie Hackers: any traction?
  - Site: visitors, sign-up conversion rate
  - Errors: any critical issues from logs
- [ ] Write a quick retro: what worked, what didn't, what to fix tomorrow

---

## T+18h: 2:01 AM EAT (Wed 8 PM ET) — Wind Down

### Davie
- [ ] One final check for unanswered comments
- [ ] Save the launch data: upvotes, comments, signups, top questions
- [ ] Draft the post-launch blog post outline (write it Thursday)
- [ ] SLEEP. You've earned it.

### Me
- [ ] Quiet monitoring mode — only flag if something critical breaks
- [ ] Don't ping Davie unless it's a real emergency (Vercel down, payments failing, etc.)

---

## T+24h: Thu 23 July 8:01 AM EAT (Wed 11 PM ET) — Post-Mortem

### Davie
- [ ] Write the post-mortem (template in `postmortem/TEMPLATE.md`)
  - What we expected vs. what happened
  - Best comment / worst comment / most-upvoted comment
  - Top 3 questions from the comments
  - Sign-up conversion: visitors → signups
  - First paid customer? (Hopefully yes)
- [ ] Email the supporters who upvoted: "Thanks. Here's what happened next."
- [ ] Post-mortem thread on Twitter

### Me
- [ ] Compile the metrics:
  - GitHub: stars gained, issues opened
  - PH: final rank of the day, final upvote count
  - HN: final rank, final upvote count
  - Site: MAU, sign-ups, free trial starts, paid conversions
  - PostHog: full funnel
- [ ] File any bugs that surfaced (we'll fix them in week 2)
- [ ] Update launch/postmortem.md with the data (so future-you has the receipts)

---

## Critical Numbers (write down as they come)

| Time | PH Upvotes | PH Comments | HN Upvotes | Signups | Errors |
|------|-----------|-------------|------------|---------|--------|
| T+1h |   |   |   |   |   |
| T+4h |   |   |   |   |   |
| T+8h |   |   |   |   |   |
| T+12h |   |   |   |   |   |
| T+24h |   |   |   |   |   |

---

## When to call it

**Stop replying to comments after T+18h.** You've made your point. People who
care will read the listing and the comments. People who don't have moved on.
Your energy is better spent on the next launch task.

**Don't try to "fix" the product at T+12h.** If something is broken, file it
for week 2. Launching a half-day late to fix a UI bug is worse than launching
on time with the bug.

**The single biggest risk is founder burnout.** You've been building for 6
weeks. You've been on a 3-day launch push. By Thursday morning, you're going
to be exhausted. **Plan to be off Slack/socials from Thursday 6 PM EAT
through Monday morning.** Let the comments roll in, let the sign-ups happen,
let the customer interviews get scheduled. You did the work. Now let it cook.

---

## What "success" looks like

Realistic targets for a first B2B SaaS launch:
- **PH**: Top 5 of the day = exceptional, Top 10 = great, Top 20 = good
- **HN**: Front page = lucky, 50+ upvotes = good, 20+ = solid
- **Signups**: 50-200 in the first 24h is normal for a B2B SaaS
- **First paid customer**: 1 in the first week is the actual milestone
  that matters for $2M ARR

If you hit any of these, the launch worked. If you hit all of them, the
product is real and you should keep going. If you hit none, that's also
data — come talk to me Friday morning and we'll figure out what to do
differently.

**The most important metric: did you ship it?** Yes. Everything else is
optimization.
