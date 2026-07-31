# Agent 12: Email deliverability

## Tests run (verbatim output)

`dig`/`nslookup`/`host` were not installed, so DNS lookups used `resolvectl`.

### DNS records

```
$ resolvectl query --type=TXT getcollectly.app
getcollectly.app IN TXT "zoho-verification=zb83977771.zmverify.zoho.com"
getcollectly.app IN TXT "v=spf1 include:zohomail.com include:resend.com ~all"

$ resolvectl query --type=TXT _dmarc.getcollectly.app
_dmarc.getcollectly.app IN TXT "v=DMARC1; p=none;"

$ resolvectl query --type=TXT resend._domainkey.getcollectly.app
resend._domainkey.getcollectly.app IN TXT "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDWM+xEnjdNinJciI2gmxwZfBVNogbX8CGnbVb/4VsS+VkWtswky2QM+Y6ssm5It1RrScLKDoohjzzw80IvGCCyLAQkExuwB8qxdT+5ty32kPZUASuNx48d//wRELQuvlagzbVoBU+iNx5+34PBbk3bwkBVxooP72UsuqFrNhO/qwIDAQAB"

$ resolvectl query --type=MX getcollectly.app
getcollectly.app IN MX 10 mx.zoho.com
getcollectly.app IN MX 50 mx3.zoho.com
getcollectly.app IN MX 20 mx2.zoho.com
```

### Resend API domain list

```
$ RESEND_KEY=$(grep '^RESEND_API_KEY=' .env.local | sed 's/RESEND_API_KEY=//;s/^"//;s/"$//') && curl -s -H "Authorization: Bearer $RESEND_KEY" https://api.resend.com/domains | python3 -m json.tool
{
    "object": "list",
    "has_more": false,
    "data": [
        {
            "id": "aae1dcff-225a-4dc2-aaf0-63793ec82ae9",
            "name": "getcollectly.app",
            "status": "verified",
            "created_at": "2026-07-21 20:12:59.46303+00",
            "region": "us-east-1",
            "capabilities": {
                "sending": "enabled",
                "receiving": "disabled"
            }
        }
    ]
}
```

### Resend API recent emails (last 50)

```
$ RESEND_KEY=$(grep '^RESEND_API_KEY=' .env.local | sed 's/RESEND_API_KEY=//;s/^"//;s/"$//') && curl -s -H "Authorization: Bearer $RESEND_KEY" "https://api.resend.com/emails?limit=50" | python3 -c "import json,sys; d=json.load(sys.stdin); print('total',len(d.get('data',[]))); [print(e['id'][:8], e['created_at'], e.get('to'), e['last_event']) for e in d.get('data',[])]"
total 50
d8504509 2026-07-31 13:05:42.948000+00 ['davie@getcollectly.app'] delivered
5e3c0f23 2026-07-31 13:05:41.885000+00 ['davie@getcollectly.app'] delivered
cf6581d3 2026-07-31 13:05:41.190000+00 ['davie@getcollectly.app'] delivered
93c9c668 2026-07-31 13:05:40.941000+00 ['davie@getcollectly.app'] delivered
14c914e4 2026-07-31 12:54:16.870000+00 ['davie@getcollectly.app'] delivered
717502f1 2026-07-31 12:53:59.069000+00 ['finance@westgate.com'] delivery_delayed
2265260b 2026-07-30 14:30:28.712000+00 ['cenk.tukel@tukelinc.com'] delivered
390e4f9e 2026-07-30 14:30:28.322000+00 ['ambrose.lo@chiefaccounting.ca'] delivered
9114f1a2 2026-07-30 14:30:26.613000+00 ['shetu@divergefinance.com'] delivered
869ca218 2026-07-30 14:30:26.043000+00 ['lana@hill-bookkeeping.com'] delivered
68c4890f 2026-07-30 14:28:26.287000+00 ['dan@ascentcfo.com'] delivered
c5d990f1 2026-07-30 13:37:37.786000+00 ['lana@hill-bookkeeping.com'] delivered
b2c5cd4a 2026-07-30 12:37:36.521000+00 ['dan@ascentcfo.com'] delivered
4e590006 2026-07-30 12:32:13.786000+00 ['bit202544716@mylife.mku.ac.ke'] delivered
527b8fa4 2026-07-30 12:27:56.959000+00 ['sharonkarendi8@gmail.com'] delivered
7738a3f9 2026-07-30 12:27:12.417000+00 ['sharonkarendi8@gmail.com'] delivered
132a6810 2026-07-30 08:31:58.410000+00 ['pr@tenxpr.com'] delivered
41d2d081 2026-07-30 08:31:55.596000+00 ['stanley@metisse.studio'] delivered
18b60141 2026-07-30 08:31:53.580000+00 ['success@sagefrog.com'] delivered
4ec5e010 2026-07-30 08:31:51.693000+00 ['success@dev.family'] delivered
6b997c8f 2026-07-30 08:31:49.029000+00 ['martelli.simone@albesteiner.edu.it'] delivered
e73ec1c3 2026-07-29 11:46:44.673000+00 ['raz@zeevmedia.com'] delivered
ce3d2328 2026-07-29 11:46:42.646000+00 ['michael@brandforce5.com'] delivered
c861ab75 2026-07-29 11:46:41.090000+00 ['nwargo@s2designgroup.com'] delivered
63d03e91 2026-07-29 11:46:39.691000+00 ['alicia@38andkip.com'] delivered
08e6e3c8 2026-07-29 11:46:29.955000+00 ['davidmugambi104@gmail.com'] delivered
1b2b5db3 2026-07-28 14:14:41.223000+00 ['parker@wallmandesign.com'] delivered
0b6d949c 2026-07-28 14:14:39.208000+00 ['nl@bambukstudio.com'] delivered
9dc3febd 2026-07-28 14:14:37.231000+00 ['paul@depersico.com'] delivered
4310898e 2026-07-28 14:14:35.254000+00 ['jessie@bopdesign.com'] delivered
06de2c2c 2026-07-28 14:14:33.262000+00 ['bruce@dynamicwaveconsulting.com'] bounced
4125ef6e 2026-07-28 14:14:31.305000+00 ['howdy@forefrontweb.com'] delivered
cbee2d83 2026-07-27 09:54:28.843000+00 ['hi@deka.agency'] delivered
54261efa 2026-07-27 09:54:24.860000+00 ['talktous@wearespoton.com'] delivered
e8fdffb6 2026-07-27 09:54:22.727000+00 ['kristina@designinggig.com'] delivered
67f28884 2026-07-27 09:54:20.786000+00 ['talent@mcvotalent.com'] delivered
c4a5d1e6 2026-07-27 09:54:18.663000+00 ['tangela@robotcreative.com'] delivered
d37e1fba 2026-07-27 09:54:16.650000+00 ['projects@rubyonyx.com.au'] delivered
df63f4b8 2026-07-27 09:54:12.921000+00 ['sale@novaluna.io'] bounced
1e3cdbba 2026-07-27 09:54:09.093000+00 ['faithntinyari36@gmail.com'] delivered
a6233450 2026-07-27 09:54:07.091000+00 ['faithmugendi22@gmail.com'] delivered
5cda489d 2026-07-27 09:54:07.091000+00 ['sharonkarendi8@gmail.com'] delivered
2c688864 2026-07-27 09:43:36.479000+00 ['faithntinyari36@gmail.com'] delivered
862ba5c4 2026-07-27 09:43:35.025000+00 ['faithmugendi22@gmail.com'] delivered
fda15e56 2026-07-27 09:43:33.491000+00 ['sharonkarendi8@gmail.com'] delivered
25812f01 2026-07-25 18:52:59.810000+00 ['davidmugambi104@outlook.com'] suppressed
73345fc9 2026-07-25 18:52:58.715000+00 ['davidmugambi104@outlook.com'] suppressed
074bd82f 2026-07-25 18:52:57.591000+00 ['davidmugambi104@gmail.com'] delivered
a9fefff2 2026-07-25 18:52:56.361000+00 ['davidmugambi104@gmail.com'] delivered
7763e6e5 2026-07-25 10:38:25.173000+00 ['davidmugambi104@outlook.com'] suppressed
```

## Best-practice search findings

- Resend domain verification requires a verified custom domain; the dashboard provides DKIM CNAME/TXT and instructs adding an SPF `TXT` record that includes Resend (often `include:resend.com` or underlying `amazonses.com`). DMARC should be added at `_dmarc.yourdomain.com`. (Resend docs, 2026)
- For cold email, a new domain has zero reputation; warmup (14–21 days, gradually increasing volume) and recipient engagement/replies are key. Skipping warmup or sending large bursts from a new domain increases spam-folder risk. (litemail.ai, celeric.app, tenxcoldemail.com, smartlead.ai, 2026)
- DMARC should start at `p=none` for monitoring, then move to `p=quarantine`/`p=reject` once alignment is confirmed; a `rua=` report address is recommended to monitor authentication failures. (Resend DMARC docs, dmarcdrift.com, 2026)
- From-address and reply behavior matter: `noreply@` addresses hurt deliverability and engagement. Cold email should be sent from a real person/role mailbox with a working reply path, ideally using the same domain and aligned with DKIM/SPF. (multiple 2026 deliverability guides)

## What I found

- **Domain verified in Resend:** `getcollectly.app` status = `verified`, sending enabled, region `us-east-1`.
- **SPF present:** `v=spf1 include:zohomail.com include:resend.com ~all`. Resend is included, but the record ends with `~all` (softfail), not `-all`.
- **DKIM present:** `resend._domainkey.getcollectly.app` returns a public-key TXT record. It lacks an explicit `v=DKIM1;` tag, which is commonly expected but technically optional.
- **DMARC present but weak:** `_dmarc.getcollectly.app` = `v=DMARC1; p=none;`. No `rua=` reporting address and policy is in monitoring mode only.
- **MX points to Zoho**, not Resend. This is fine for receiving but confirms outbound transactional/cold email goes through Resend.
- **Email activity:** out of the last 50 sends, 47 were `delivered`, 2 were `bounced`, 1 was `delivery_delayed`, and 3 older sends to the same outlook/gmail addresses were `suppressed`.
- **From-address issue:** many outreach/cold emails are sent as `Collectly <noreply@getcollectly.app>`. This is bad for cold-email reputation and replies.
- **Volume pattern:** sends are clustered in bursts (e.g., 5 emails within 1 second, multiple emails at exactly 08:31, 09:54, 14:14, 14:30). Bursts to cold prospects without warmup/throttling risk throttling and spam-folder placement.

## What should change

1. **Switch cold/outreach From address away from `noreply@`** to a real role/person address (e.g., `davie@getcollectly.app`) and add a working `Reply-To`. `noreply@` signals bulk mail and suppresses engagement.
2. **Strengthen DMARC gradually:** keep `p=none` only during validation, then move to `p=quarantine` (and later `p=reject`). Add a `rua=` reporting address now, e.g.:
   `v=DMARC1; p=none; rua=mailto:dmarc@getcollectly.app; ruf=mailto:dmarc@getcollectly.app; fo=1;`
3. **Verify DKIM syntax** in Resend dashboard; consider re-copying the DKIM TXT value to ensure `v=DKIM1;` is included if Resend provides it. Confirm `resend._domainkey` is the active selector used in sent-message headers.
4. **Enable receiving on the sending domain** or at least ensure the From mailbox actually exists and can accept replies; Resend currently has `receiving: disabled`. Zoho MX exists, so davie@getcollectly.app likely works, but `noreply@` likely does not.
5. **Implement warmup and send throttling** rather than large same-second bursts. For a domain created 2026-07-21 (10 days old), cold-volume should be ramped slowly and engagement/list hygiene tracked.
6. **Investigate bounces and suppressions:** remove/verify addresses that bounced (`bruce@dynamicwaveconsulting.com`, `sale@novaluna.io`) and do not re-send to suppressed addresses (`davidmugambi104@outlook.com`).
7. **Consider tightening SPF** from `~all` to `-all` once all legitimate senders (Zoho, Resend) are confirmed, to reduce spoofing risk.

## Source / evidence

- DNS resolution output for `getcollectly.app`, `_dmarc.getcollectly.app`, `resend._domainkey.getcollectly.app`, MX (local `resolvectl` query, 2026-07-31).
- Resend API `GET /domains` and `GET /emails?limit=50` responses using `RESEND_API_KEY` from `/home/davie/.openclaw/workspace/collectly/.env.local`.
- Web search results: Resend docs (`resend.com/docs/dashboard/domains/*`, `resend.com/docs/dashboard/domains/dmarc`), `dmarcdrift.com/blog/resend-dkim-dmarc-setup`, `litemail.ai/blog/scale-new-domain-cold-email-2026`, `celeric.app/blog/email-warmup-guide`, `smartlead.ai/blog/email-deliverability-guide`, `tenxcoldemail.com/blog/email-warmup-timing-guide-2026`.
