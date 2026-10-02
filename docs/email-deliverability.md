# Email deliverability: SPF, DKIM, DMARC

Mugavi sends reminders through Resend. There are two cases.

## 1. Mugavi's own sending domain (mugavi.com), set up by the operator

Do this once, in the Resend dashboard (Domains, Add domain, mugavi.com), then at the DNS host for mugavi.com (Namecheap).

1. Add the records Resend shows. They are a DKIM TXT (`resend._domainkey`), an SPF TXT on the `send` subdomain, and an MX on `send` for bounce handling. Use the exact values Resend displays. Do not merge the SPF value into an existing root SPF record: Resend's SPF lives on `send.mugavi.com`, not the root.
2. Wait for Resend to show Verified.
3. Add DMARC at `_dmarc.mugavi.com` as TXT: `v=DMARC1; p=none; rua=mailto:<a mailbox you read>`. Start at `p=none`. After a few weeks of clean reports, move to `p=quarantine`, later `p=reject`.
4. Set `RESEND_FROM_EMAIL` (and `RESEND_FROM_NAME`) to an address on mugavi.com. Note: the code falls back to `hello@getcollectly.app` if it is unset (src/lib/infra.ts), which is the old domain.
5. Set `RESEND_DELIVERY_WEBHOOK_SECRET` and point a Resend webhook at `/api/webhooks/resend-delivery` for email.delivered, email.opened, email.clicked, email.bounced, email.complained.
6. Do not send from a mailbox that also has a second SPF record. A domain may have only one SPF TXT at the same name.

## 2. A customer's own domain (Dashboard, Reminders, Send settings)

The customer enters their domain (for example acme.com) and a sender name (default `billing`). Mugavi asks Resend for the records and shows them in a table. The customer adds them at their registrar:

- DKIM: one TXT record. Proves the mail was signed by an authorised sender.
- SPF: one TXT and one MX record, on a `send` subdomain. These do not touch the customer's normal mail on the root domain.
- DMARC (recommended, not required for verification): a TXT at `_dmarc.<domain>` with `v=DMARC1; p=none`. If the domain already has a `_dmarc` record, keep it. Two DMARC records make both invalid.

Then press Check verification. DNS can take from minutes to a day. Until the status is Verified, reminders go out from Mugavi's address with the business name on it, and the Reminders page says so in a warning.

Common mistakes: the registrar appends the domain automatically, so `resend._domainkey.acme.com.acme.com` appears (enter only `resend._domainkey`); a trailing-dot or quote mismatch in a long DKIM value; a Cloudflare proxy toggle on a CNAME (set to DNS only); free mailbox domains such as gmail.com cannot be used.

## What Mugavi does when mail fails

| Resend event | Run status | Customer |
| --- | --- | --- |
| delivered, opened, clicked | moves forward only, never back | unchanged |
| bounced, Permanent | failed ("bounced: ...") | switched off (do not disturb), no more reminders |
| bounced, Transient or Undetermined | failed ("temporary bounce: ...") | unchanged, keeps getting reminders |
| complained (marked as spam) | failed | switched off |

The rules live in `src/lib/dunning/delivery-events.ts` and are tested without a database or Resend. The Reminders page shows a warning when reminders failed in the last 14 days, and another when the owner's domain is not verified (`src/lib/dunning/sender-health.ts`).

## Limits

This is guidance, not a guarantee of inbox placement. Nothing here was tested against a live Resend account: verification, the webhook and bounce handling were checked against signed stand-in payloads only.
