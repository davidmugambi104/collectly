# Bookkeeper channel — round 2 drafts (2026-09-20)

The six prospects in `bookkeeper-channel-prospects.csv` with `status: ready` —
written up 2026-08-04 and never contacted.

**Why this channel — corrected 2026-09-20.** An earlier version of this file
claimed this channel produced "the only reply the campaign ever got". That was
wrong, and the error is worth recording because it survived six review cycles.

The reply attributed to this channel on 2026-07-30 is a **test fixture**. It is
logged in `outreach-state.json` with `source: manual_test`, received **21 seconds**
after the t1 was sent, reading "Thanks, this sounds interesting. Can we schedule a
15-min call next week?" The status report written that same day independently
records `replied: 0 (in this channel)`.

That fixture did real damage. It inflated `experiment-status.json` variant A to
51/1 (flagged as unresolved in six consecutive decision logs), and it caused a
real follow-up email to be sent to a real person on 2026-08-23 premised on
interest she had never expressed. Three further review cycles then queued a
"breakup" email on the same false basis. She is now marked `do_not_contact`.

**So the honest position:** across ~415 sends this campaign has produced one real
reply, and it was a rejection. Not 0.34% — zero positive. This channel has 5 sends
and 0 replies of its own. It is not chosen because it worked.

It is chosen for three reasons that do not depend on results we do not have:

1. **Relevance is the legal basis.** Inferred consent under the NZ and AU regimes
   requires the message be directly relevant to the recipient's professional
   function. You cannot be directly relevant to 255 people at once, so per-person
   research is what makes the send lawful at all outside the US.
2. **Advisor economics.** An advisor carries multiple client books, so one who
   adopts brings several orgs rather than one.
3. **Three is the target, not 255.** The Xero App Store requires 3 active
   customers before it will list an app, and that listing is the only route here
   that is not outbound forever.

If this round also returns zero, that is real evidence, and the conclusion is that
the product has no pull with this audience — not that the copy needs another pass.

**Rules carried over from v1, which still hold:** max ~90 words, no links in the
body, one verifiable detail from the prospect's own site, product appears no
earlier than sentence three, CTA is a reply.

**Changed from v1:** no meeting ask. v1 closed on "worth a 10-minute
conversation?" — at a 0.34% reply rate we have not earned thirty minutes of a
stranger's calendar. Each of these ends on a question answerable in one line.
Same reasoning as `t1-v6-2026-09-19.md`.

**Consent basis (US/CAN-SPAM):** each address is published by the firm on its own
site. Opt-out is satisfied by the reply line plus the unsubscribe footer
`send_one()` now appends. No site below carried a "no unsolicited" notice —
checked 2026-09-20.

---

## Qualification: 3 send, 1 hold, 2 drop

| id | firm | verdict | reason |
|---|---|---|---|
| …b5e07b | Sparq Partners | **send** | Accounting firm for creative/production work. Strong AR exposure. |
| …b5e071 | Moore Accounting | **send** | Bookkeeping + fractional CFO across client books, delivered remotely. |
| …b5e080 | Kommas with Kellé | **send** | Fractional CFO. Site repositioned since the 2026-08 pull — see note. |
| …b5e078 | Avolon Accounting | **hold** | Site sits behind a bot-check; nothing verifiable. No detail, no email. |
| …b5e07d | Ward Law, LLC | **drop** | A Philadelphia litigation firm, not an AR advisor. Wrong channel. |
| …b5e07e | Joe Mastriano, P.C. | **drop** | IRS tax controversy — liens, levies, offers in compromise. Wrong job. |

Ward Law is misfiled rather than worthless: a 26-person law firm bills clients
and has its own AR problem, so it is a *customer* pitch, not a partner pitch. It
is marked `out_of_channel` here and has **not** been added to `prospects.csv` —
the fit is unverified (law firms usually run practice-management software rather
than Xero) and I am not padding a list that has returned zero from 292. If it
goes anywhere it needs the same site-read qualification as the three above.

---

## …b5e07b — Rozlynn Yong, Sparq Partners

**Detail (sparqpartners.com, read 2026-09-20):** "a small and mighty accounting
firm specializing in all things creative. From film and commercial production, to
post and VFX, traditional advertising all the way to Web3." Tagline: "we'll put
out the fires before they even happen."

**Subject:** the AR side of production accounting

```
Hi Rozlynn,

Sparq works the creative side — production, post, VFX, agencies. That's an
area where getting paid runs on someone else's schedule: net-60 from a
studio, an agency waiting on its own client, a PO that changes mid-project.

I'm building something that handles the chasing part — it reads the reply,
holds a promised date, and restarts on its own if the money doesn't land.
It connects to Xero.

Does that chase sit with your team, or with the client's?

Davie
```

*Why this one:* their own tagline is about preventing fires. Late payment is the
fire that prevention doesn't reach, because it depends on a third party. The
closing question is a real fork — if the client chases, they're not a prospect,
and I'd rather find that out in one line than after three follow-ups.

---

## …b5e071 — April Moore, Moore Accounting

**Detail (mooreacctg.com, read 2026-09-20):** service list reads "Bookkeeping:
manage daily transactions", "Fractional CFO/Accounting", "Virtual Services:
Remote Accounting and Bookkeeping".

**Subject:** chasing invoices across client books

```
Hi April,

Moore Accounting runs bookkeeping and fractional CFO work remotely, across a
set of client books. The part of that I keep hearing doesn't scale is AR
follow-up — it's per-client, it's manual, and it's nobody's favourite hour.

I'm building a tool that automates the chase and reports back per client.
It connects to Xero.

Is debtor follow-up something you do for clients now, or something you leave
with them?

Davie
```

*Why this one:* "remote" is the lever. Everything else in a virtual bookkeeping
practice scales through software; the AR chase is the piece still done by hand.
The question qualifies them outright.

---

## …b5e080 — Kellé, Kommas with Kellé

**Detail (kommaswithkelle.com, read 2026-09-20):** "We guide high-achieving women
CEOs to turn revenue into real, sustainable wealth by aligning business strategy
with personal financial goals **after revenue is no longer the challenge**."
Services: Fractional CFO, Business Advisory, Speaking.

**Note — the 2026-08 data is stale.** The Apollo keyword pull recorded "accounts
payable, accounts receivable, collections, ebiling management" for this firm. The
live site leads with none of that; it has repositioned to fractional CFO and
wealth advisory. Writing from the old keywords would have asserted a service line
they appear to have dropped. Drafted from the current site instead.

**Subject:** revenue that hasn't landed yet

```
Hi Kellé,

Your work starts where revenue stops being the problem — which is usually the
point a founder notices the gap between what they've billed and what has
actually arrived.

I'm building a tool that closes that gap: it chases overdue invoices, holds a
promised payment date, and restarts on its own when the date slips. It
connects to Xero.

When you take on a client, is AR usually in decent shape already, or is it
the first thing you fix?

Davie
```

*Why this one:* their entire positioning is "past the revenue problem", which is
precisely the stage where receivables, not sales, become the constraint on cash.

---

## …b5e078 — Candy Yu, Avolon Accounting — HELD

avolonabs.com returns an interstitial bot-check rather than page content, so
there is no verifiable detail to write from. Apollo keywords list "cfo services,
forensic accounting, bookkeeping clean up catch up, quickbooks customized
training" — but the Kommas case above is exactly why those are not enough on
their own: that data is from 2026-08 and was already wrong once.

Five minutes in a browser resolves it. Until then this one does not send.
