# t1-cold-v2.md — pain-based opener, sends Tue/Wed 09:00 EAT

> **Use this for handpicked sends (10 per week, 5/day).** The old
> t1 (workflow-based) batched 30 in one shot and got 0% positive
> reply. This version asks about a specific painful moment instead.
>
> **From:** `David Mugambi <hello@getcollectly.app>` (or your personal Gmail)
> **To:** {{first_name}} <{{email}}>
> **Send window:** 09:00 EAT (06:00 UTC) = start of UK morning,
> overlap with US East early. Avoids weekend sends.

## Subject

`QBO invoice, 2 weeks overdue, awkward to chase?`

Alternates if you want to A/B (use 1 subject per recipient, track which):
- `QBO invoice, 2 weeks overdue — who chases?`
- `2-week overdue invoice, awkward to nudge the client?`
- `Quick QBO collections question for {{first_name}}`

## Body (3 short paragraphs, 2 sentences each)

```
Hi {{first_name}},

Quick question: any QBO invoice on your books right now that's
14+ days overdue — big enough to matter, but awkward to chase
because the client is still active?

I'm building Collectly for small studios and agencies on
QuickBooks who do project work and live with awkward 2-4 week
follow-up cycles. We use tone-aware AI to send the nudge so it
doesn't read like a robot or burn the relationship. Early, live,
starting with a small batch before broad launch.

Worth 10 minutes this week? I can send a few open times.

Davie Mugambi
```

## {{hook}} slot (use only if you have one specific observation)

If you have a real, current observation about the prospect's
company (their last project, a recent hire, a public post about
cash flow, a Clutch/Glassdoor pattern), drop it as paragraph 0
*before* the question. This is what converts "templated cold" to
"handpicked." Examples:

```
Saw {{first_name}}'s piece on [specific project] last month —
[one specific thing]. Made me think of the
```

```
Caught {{company}}'s site refresh — clear sign you're shipping
into client work every week. Made me think of the
```

If you don't have a real hook, send without it. **Do not
fabricate a hook.** A naked "Quick question: any QBO invoice..."
still works because the question itself is specific.

## What to track (in outreach/data/outreach-log.csv)

After each send, set:
- `status = sent`
- `detail = v2 opener; hook:[yes/no]`
- `segment = agency` (new uniform segment)

## What "positive reply" means (definition, so you don't lie to yourself)

A positive reply includes any of:
- Pain-language reply: mentions late invoices, chasing clients,
  cash flow, awkward follow-up, or QBO/Xero
- Asks a substantive question back ("how does the AI handle
  tone?")
- Asks for a time ("Tuesday at 2?")
- Asks for a call link / Calendly

A reply that is **not** positive:
- "Not interested"
- "We use [competitor]"
- "Please remove me"
- Bounce / out-of-office / auto-reply
- "Send me more info" (without pain language — usually a polite
  brush-off)

## Pass/fail target for first 10 sends

- **0/10 positive**: opener or list is broken. Do not send the
  remaining 20. Rewrite and re-test on 5 new prospects.
- **1/10 positive**: weak signal. The question is right but
  delivery is off. Add 1 specific {{hook}} per send and re-test
  on next 5.
- **2-3/10 positive**: opener is right. Send the remaining 20
  with same opener, 5/day cadence.
- **4+/10 positive**: opener is strong. Move to t2 followup
  template (next file) and re-engage replies.

---

Davie Mugambi · Collectly · getcollectly.app

If this isn't relevant, you can unsubscribe here:
https://getcollectly.app/api/unsubscribe?token={{unsubscribe_token}}
