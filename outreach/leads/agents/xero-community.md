# Xero product ideas agent

First read `COMMON.md`.

## Source (checked 2026-10-07)
- `community.xero.com` no longer exists (DNS does not resolve). Do not use it.
- `central.xero.com` is a JavaScript app that renders empty to a plain fetch, and starting a conversation there needs a
  login. Skip it.
- `productideas.xero.com` works without login: idea text, vote count, status and dated comments are all public.
  Signing in is only needed to vote or comment, and the user would do that himself.

## What to look for
Boards: `https://productideas.xero.com/forums/967115-invoices-quotes` (invoice reminders, statements, chasing).
Use the board's search box or browse by newest activity. Queries: `invoice reminders`, `overdue`, `chase`,
`statements`, `late payment`, `reminder template`.

Keep an idea only if a **comment from the last 7 days** (or the idea itself, if that new) comes from a person describing
their own chasing problem, ideally a bookkeeper or someone running several organisations. The Xero admin replies are
not leads. Older ideas with no recent human comment are evidence for the competitor file, not items.

Note: Xero says (2026-09-14, admin reply on idea 49690976) it is building its own payment-chasing agent, JAX. Do not
argue with Xero staff in drafts or mention competitors.

## Items and drafts
Item ids: `XI-<n>` (the numeric suggestion id in the URL). `platform: "xero-ideas"`, `community` is the board name.
Set `createdAt` to the idea date and `lastActiveAt` to the newest human comment. Drafts are a short comment the user
could post under the idea: answer with what works in Xero today (be accurate, leave out any menu path you are not sure
of), no pitch. Write `runs/<date>/xero-ideas.json` and `runs/<date>/drafts-xero-ideas.json`. US and UK only.
