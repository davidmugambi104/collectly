# Tier 1 handpick shortlist — 10 sends, 5/day Tue + Wed 09:00 EAT

> **Source:** `outreach/data/prospects.csv` filtered to `tier=1`
> **Opener:** `outreach/messages/t1-cold-v2.md`
> **Cadence:** 5 sends Tue 22 July, 5 sends Wed 23 July
> **Send time:** 09:00 EAT (06:00 UTC)
> **From:** `David Mugambi <hello@getcollectly.app>` or your personal Gmail
> **Goal:** 8-15% positive reply rate (1-2 of 10)

## How to use this file

1. Open `outreach/data/prospects.csv`, filter `tier=1`
2. For each row, do a 2-min pre-send check:
   - Visit their site, look at their last 2-3 projects
   - Skim their LinkedIn (founder's posts, especially anything about cash, clients, operations)
   - Check if they've publicly mentioned QBO or Xero on the site
3. If you find a real hook, paste it into the `hook` column of the CSV AND into the email body (paragraph 0)
4. If you don't find a hook in 2 min, send without one — the question itself is specific enough

## Tier 1 (10 prospects, in send order)

| # | ID | Company | Country | Size | First | Email |
|---|---|---|---|---|---|---|
| 1 | P001 | Analogue Creative | GB | 11-25 | Barry Darnell | hello@studio-analogue.com |
| 2 | P002 | Edna Studio | GB | 5-10 | Matt Davis | courtney.dodds@edna.studio |
| 3 | P004 | Foundry Leeds | GB | 5-10 | Pat Holmes | jason@foundrybend.org |
| 4 | P008 | Brand Britain | GB | 5-10 | Russel D'Ambrosio | bev@brandbritain.co.uk |
| 5 | P009 | Bert Agency | GB | 11-25 | Jon Burdon | jon.burdon@bertagency.co.uk |
| 6 | P019 | O8 Agency | US | 11-25 | Andy | andy@o8.agency |
| 7 | P023 | Fluency Firm | US | 5-10 | Devin | devin@fluencyfirm.com |
| 8 | P026 | Workshop Digital | US | 11-25 | Workshop Digital | morgan@workshopdigital.com |
| 9 | P027 | Bop Design | US | 5-10 | Bop Design | jessie@bopdesign.com |
| 10 | P029 | DD.NYC | US | 11-25 | DD NYC | anjelika@dd.nyc |

## Send 1 (Tue 22 July, 09:00 EAT, 5 sends)

1. P001 — Analogue Creative
2. P002 — Edna Studio
3. P004 — Foundry Leeds
4. P008 — Brand Britain
5. P009 — Bert Agency

## Send 2 (Wed 23 July, 09:00 EAT, 5 sends)

6. P019 — O8 Agency
7. P023 — Fluency Firm
8. P026 — Workshop Digital
9. P027 — Bop Design
10. P029 — DD.NYC

## Per-prospect notes (copy from `outreach/data/prospects.csv` notes column)

- **P001 Analogue Creative**: Seriously Playful branding & motion studio; 16+ yrs experience; clear founder tone
- **P002 Edna Studio**: Words + pictures for behaviour change; 20+ yrs; small Leeds studio
- **P004 Foundry Leeds**: Brand worlds for ambitious clients; 16 yrs experience; solo/very small
- **P008 Brand Britain**: Leeds; product brand & growth; 1.8k followers
- **P009 Bert Agency**: Manchester & London branding agency; Adidas, Hidden Hut clients
- **P019 O8 Agency**: Digital marketing for healthcare (vertical with longer payment cycles)
- **P023 Fluency Firm**: Data + omni-channel + creative
- **P026 Workshop Digital**: Best Small PPC Agency 2025
- **P027 Bop Design**: San Diego B2B web design + content marketing; 122 reviews
- **P029 DD.NYC**: NYC design + dev; 103 reviews

## After sending

1. For each send, append a row to `outreach/data/outreach-log.csv` with:
   - `id` = the prospect id (P001 etc.)
   - `email` = their address
   - `touch` = `t1`
   - `sent_at` = ISO timestamp
   - `status` = `sent`
   - `detail` = `v2 opener; hook:[yes/no]; short note about what hook you used`
   - `segment` = `agency`
2. **Don't check for replies for 48 hours.** Founders don't reply in <2 hours; if you check too early you'll mentally downgrade a "no reply" as a "no" when it's just "not yet."
3. After 48 hours (Thu 24 July 09:00 EAT), count positive replies (see definition in t1-cold-v2.md).
4. **Write the result here** in this file under "## Result" below.

## Result (fill in after Thu 24 July)

- Sent: X/10
- Positive replies: Y/10
- Of which pain-language: Z/10
- Of which booked-a-call: W/10
- Of which "send more info" (no pain): V/10
- Of which "not interested" / no reply: U/10

**Pass/fail:**
- Y >= 2: opener is right. Send tier 2 batch next week.
- Y == 1: weak signal. Add 1 specific {{hook}} per send, re-test on 5 new prospects.
- Y == 0: opener is broken. Stop sending. Rewrite the question itself.

## Do NOT do

- Do not send to all 10 in one batch. The whole point is 5/day so you can iterate the hook on send 2 if send 1 flops.
- Do not CC your personal email. The "from" should be the same address that gets the reply.
- Do not follow up before Thu. Founders get 50+ emails a day; a polite non-reply at 24h is normal.
- Do not resend to anyone in tier 1 with a "bump" — if they didn't reply, they didn't reply. Move to t2 followup template (separate file) or tier 2 prospects.
