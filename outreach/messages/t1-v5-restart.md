# t1-v5-restart.md — the 112-prospect restart

**Status:** DRAFT. Nothing here sends until Davie approves.
**Drafted:** 2026-09-11
**Replaces:** `t1-cold-v3-industry-variants.md` and the A/B/C/D subject matrix,
both retired — see `decisions.md` 2026-09-11.

---

## Why the last 313 sends produced one reply

Not the copy. Two structural problems that no amount of subject-line testing
could reach.

**Two-thirds of the list could not receive mail.** 253 of 385 addresses were
`hello@`/`info@` guesses. The variants weren't losing to each other; there was
no signal to measure. 198 are now quarantined, 38 hard bounces suppressed, and
112 named contacts remain.

**The one reply we ever got was to a different pitch than the one we kept
sending.** Lana Hill, a bookkeeper, replied to *"Workflow automation for
bookkeeping clients"* — a partner pitch. Every A/B/C/D variant since has been a
direct-AR pitch: *"QBO invoice, 2 weeks overdue, awkward to chase?"* To a
bookkeeping firm that asks about **their own** overdue invoices, which is not
their problem. Their problem is doing AR chase-up across twenty client books.

So the list splits by which job the reader actually has.

| Segment | Count | Their job | Pitch |
|---|---|---|---|
| **A — Partner** | 40 | Runs AR *for other people's* businesses | Do it across your whole book |
| **B — Direct** | 72 | Has their own overdue invoices | Chase without burning the client |

---

## Hard constraint: do not use `{{first_name}}`

**Only 47 of 112 prospects have a first name.** `daily_send.py` substitutes
`{{first_name}}` with an empty string, so `Hi {{first_name}},` renders as
**`Hi ,`** for 65 people. Every existing template has this bug.

`{{company}}` is present for all 112. Every template below opens on company.
The `{{first_name}}` variants at the bottom are for the 47 only, and must not
be sent to anyone else.

---

## Segment A — Partner (40 prospects)

Bookkeeping (25), accounting (15). The pitch that earned the only reply.

### A1 — first touch

**Subject:** `AR follow-up across your client book`

```
Hi there,

{{company}} runs the books for a set of small businesses, which means
someone there chases overdue invoices across all of them. Usually the
same awkward email, twenty times, from whoever has a spare hour.

I'm building Collectly to take that off a firm's plate — connects to
QBO and Xero, sends the follow-up in your voice, stops the moment a
client pays.

Is AR chase-up something {{company}} does for clients, or do you leave
it with them?

Davie
Founder, Collectly
```

*79 words. The question is genuinely open — "we leave it with them" is a
useful answer and an easy reply to write. No link. Reply is the CTA.*

### A2 — follow-up, +4 working days, only if no reply

**Subject:** `Re: AR follow-up across your client book`

```
Hi there,

Following up once on this.

The specific thing I'd want your read on: when a client's invoice goes
30 days past due, does {{company}} chase it, or flag it back to the
client to handle?

That one answer decides whether what I'm building is any use to firms
like yours. Happy to hear it's the second one.

Davie
```

*57 words. Asks for a fact, not a meeting. "Happy to hear it's the second one"
makes a negative reply easy, which is how you find out you're wrong cheaply.*

### A3 — close, +7 working days

**Subject:** `Re: AR follow-up across your client book`

```
Hi there,

I'll stop here — I don't want to be another thing in the inbox.

If AR chase-up ever becomes a thing {{company}} wants to hand off,
reply to this and I'll pick it straight back up. Otherwise all the best
with it.

Davie
```

*47 words. A real close, not a fake one. Nothing sends after this.*

---

## Segment B — Direct (72 prospects)

Branding (21), marketing agency (12), design (9), consulting (6), plus smaller
digital/web/motion/ecommerce segments.

The honest position on this segment: **it has produced zero replies in 313
sends.** The list was undeliverable so that result means little, but it is not
evidence the pitch works either. Treat B as an experiment, not a plan.

### B1 — first touch

**Subject:** `Chasing a client who's still a client`

```
Hi there,

The invoice that's awkward isn't the one from a client who ghosted —
it's the one from a client {{company}} is still actively working with.
Chasing it feels like it costs more than the invoice is worth.

Collectly sends that follow-up so you don't have to, and stops the
second they pay or reply.

Does that land, or is getting paid on time mostly a solved problem for
{{company}}?

Davie
Founder, Collectly
```

*80 words. The opening line is the actual insight and the reason someone reads
past it. The closing question offers a real exit, which raises reply rate from
people who'd otherwise ignore it.*

### B2 — follow-up, +4 working days

**Subject:** `Re: Chasing a client who's still a client`

```
Hi there,

One follow-up, then I'll leave it.

Rough sense: how far past due does an invoice get at {{company}} before
someone actually sends the chaser? A week? A month? Never quite?

I'm trying to find out whether that gap is real or whether I've invented
a problem. Either answer helps.

Davie
```

*55 words. "Whether I've invented a problem" is true and it reads as true,
which is why people answer it.*

### B3 — close, +7 working days

**Subject:** `Re: Chasing a client who's still a client`

```
Hi there,

Closing the loop — no more from me on this.

If invoices ever start sitting longer than {{company}} would like,
reply here. Good luck with the work.

Davie
```

*38 words.*

---

## Named variants — the 47 with a first name only

Identical bodies, with the opener swapped:

- `Hi there,` → `Hi {{first_name}},`
- In A1 and B1 only, the second sentence may use the first name once more.

**Do not send these to the 65 without a first name.** Segment by
`first_name != ""` before the send, not by tier.

---

## Send rules

These matter more than the copy. The domain is carrying a 34.2% seven-day
bounce rate and the gate has been in `pullback` for eight days.

**Volume ramp — not the 30/day cap.** The cap is a ceiling, not a target.
Reputation recovers on consistency at low volume, not on filling a quota.

| Days | Per day | Segment |
|---|---|---|
| 1–3 | 5 | A only |
| 4–6 | 8 | A only |
| 7–10 | 12 | A, then B once A1 is exhausted |
| 11+ | 15, hold | Both |

**Stop conditions — any one of these halts the ramp and holds volume flat:**

- 7-day bounce rate does not fall below 10% by day 5
- any single day bounces more than 1 in 20
- a spam complaint, at any volume

**Other rules:**

- Tue–Thu only. Monday and Friday sends look automated.
- 09:00–11:00 in the recipient's timezone. The list is US 69 / GB 21 / AU 9 /
  CA 10, so this needs three send windows, not one.
- No link in the first email. The CTA is a reply. Links in a cold first touch
  are the single biggest spam-filter signal we control.
- Plain text. No tracking pixel, no HTML wrapper.
- Reconcile `suppression.csv` against the live Resend bounce list **before**
  every batch. On 2026-09-11, 38 already-bounced addresses were still absent
  from it and would have been re-sent to.
- One sequence per prospect, ever. A3/B3 means finished.

---

## What would tell us this worked

At 112 prospects, statistics are not available. Do not compute a reply rate off
this list and do not resurrect the A/B matrix — a 4-way test needs roughly 400
sends per arm to separate 1% from 2%, and we have 112 people total.

What we are actually buying is two things:

1. **Deliverability recovery.** Bounce under 5% and the gate back to `allow`.
   That is the real deliverable, and it unblocks everything else.
2. **Three to five replies of any kind**, including "no". Five honest answers
   to the A2 question — *do you chase, or hand it back?* — settles whether the
   partner pitch has a business behind it. That is worth more right now than
   another 300 sends into silence.

The scale rebuild happens on **2026-09-20**, when the Hunter free tier resets
to 50 domain searches. `domain_search` returns named people per domain with
confidence scores; against the 197 quarantined domains that is plausibly
150–400 named contacts. Until then this list is what exists.
