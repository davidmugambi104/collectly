# Rules for every lead-sourcing agent (read fully)

Goal: find people who are, right now, in pain about chasing invoices, late payments or cash flow from unpaid clients,
and draft a reply the user can post by hand. Mugavi (mugavi.com) is invoice-reminder software for small businesses and
the bookkeepers who work with them. US and UK only, never Kenya.

## Never
- Post, comment, vote, message, follow, log in, sign up or accept terms. Read-only. Use the user's Windows debug Chrome
  on port 9222 only for reading: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\Public\cdp\cdp.ps1`
  (single Page.navigate / Runtime.evaluate calls). Open your own tab with an HTTP PUT to `/json/new?<url>`, activate it
  with `/json/activate/<id>` before reading, close it with `/json/close/<id>` when done. If a page asks for a login,
  consent or captcha, stop that page and note it.
- Record usernames, emails, phone numbers or profile links. Items carry the post link and text only.
- Read or print secrets or .env files.
- Invent anything: no made-up stats, customer counts, testimonials or claims about Mugavi. Claims about Mugavi must stay
  inside `~/collectly-market-research/15-marketing-brief.md`.

## Pick threads worth answering
Keep a thread when someone is asking for help or describing the pain, the thread is open (not locked, under about six
months old on Reddit), and a plain useful answer exists. Skip: founders validating an idea ("would you use my tool"),
people launching or promoting a product, competitors (Chaser, Paidnice, Chasd, Upflow, Gaviti, Growfin, HighRadius,
BILL, Melio) except to note them, threads that are mostly hostile, threads about failed card payments rather than
invoices, and Kenya. Subreddit rules often ban promotion and lead generation: help only.

## Writing the draft reply
- Help first. Answer the actual question in the thread, with something they can do today. Reference a specific detail from
  their post so it cannot be mistaken for a template.
- Sound like a person: plain sentences, no headings, no bullet lists unless the thread is already list-style, no
  rule-of-three padding, no hype words (seamless, leverage, game-changer, delve, unlock, streamline, robust).
- No em-dashes or en-dashes anywhere. No links of any kind. 40 to 900 characters.
- Mention Mugavi only when the person explicitly asks for a tool, or the thread is about exactly what it does and a
  plain one-line mention helps. Then set `mentionsMugavi: true` and give `mentionReason`. Say what it does and what it
  does not do yet (QuickBooks connection is in beta; a person approves every message). Default is no mention.
- `painPoint`: one plain line describing what they are struggling with, in your words.

## Output
Write `runs/<date>/<platform>.json` and `runs/<date>/drafts-<platform>.json` exactly as in `../README.md`. Keep 15 to 40
items; quality over count. Final reply to the lead: 100 words max: files written, counts, what you skipped and why,
anything that blocked you.
