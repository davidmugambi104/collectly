# t1-cold-v3-industry-variants.md

> **Use this instead of t1-cold-v2 when you have ≥2 min of pre-send
> research and know the prospect's industry.** The v2 generic opener
> is fine; the v3 variants match each industry's actual vocabulary,
> which is the difference between "this is templated" and "this
> person understands our work."

> **Send rules unchanged from v2:** 5/day Tue + Wed 09:00 EAT,
> tier-1 list in `outreach/data/TIER-1-SHORTLIST.md`, log every
> send to `outreach/data/outreach-log.csv` with `detail = v3 opener;
> variant:<industry>`.

## Subject (one — same for all variants)

`QBO invoice, 2 weeks overdue, awkward to chase?`

## Body — pick the variant that matches `outreach/data/prospects.csv > industry`

### Branding (12 prospects in tier 2)
```
Hi {{first_name}},

Any QBO invoice for a brand project that's 14+ days overdue —
big enough to matter, but awkward to chase because the client
is still in rollout?

I'm building Collectly for small studios and agencies on
QuickBooks who do project work and live with awkward 2-4 week
follow-up cycles. We use tone-aware AI to send the nudge so it
doesn't read like a robot or burn the relationship. Early, live,
starting with a small batch before broad launch.

Worth 10 minutes this week? I can send a few open times.

David
```

### Design (4 prospects)
```
Hi {{first_name}},

Any QBO invoice for design work that's 14+ days overdue — big
enough to matter, but awkward to chase because the client is
still giving feedback?

I'm building Collectly for small studios and agencies on
QuickBooks who do project work and live with awkward 2-4 week
follow-up cycles. We use tone-aware AI to send the nudge so it
doesn't read like a robot or burn the relationship. Early, live,
starting with a small batch before broad launch.

Worth 10 minutes this week? I can send a few open times.

David
```

### Web design (4 prospects)
```
Hi {{first_name}},

Any QBO invoice for a site build that's 14+ days overdue — big
enough to matter, but awkward to chase because the client is
still in revisions?

I'm building Collectly for small studios and agencies on
QuickBooks who do project work and live with awkward 2-4 week
follow-up cycles. We use tone-aware AI to send the nudge so it
doesn't read like a robot or burn the relationship. Early, live,
starting with a small batch before broad launch.

Worth 10 minutes this week? I can send a few open times.

David
```

### Digital marketing / SEO / PPC (5 prospects)
```
Hi {{first_name}},

Any QBO retainer or campaign invoice that's 14+ days overdue —
big enough to matter, but awkward to chase because the work is
still running?

I'm building Collectly for small studios and agencies on
QuickBooks who do project work and live with awkward 2-4 week
follow-up cycles. We use tone-aware AI to send the nudge so it
doesn't read like a robot or burn the relationship. Early, live,
starting with a small batch before broad launch.

Worth 10 minutes this week? I can send a few open times.

David
```

### Ecommerce agency / beauty marketing (3 prospects)
```
Hi {{first_name}},

Any QBO invoice for a store build or CRO work that's 14+ days
overdue — big enough to matter, but awkward to chase because
the client is still active?

I'm building Collectly for small studios and agencies on
QuickBooks who do project work and live with awkward 2-4 week
follow-up cycles. We use tone-aware AI to send the nudge so it
doesn't read like a robot or burn the relationship. Early, live,
starting with a small batch before broad launch.

Worth 10 minutes this week? I can send a few open times.

David
```

## How to use this

1. Look up the prospect's `industry` in `outreach/data/prospects.csv`
2. Pick the matching variant above
3. If you have a real `{{hook}}`, drop it in as paragraph 0 (per
   v2 doc); otherwise send as-is
4. Track with `detail = v3 opener; variant:<industry>`

## Mapping reminder (so you don't have to re-read the CSV)

| Industry column value | Variant to use |
|---|---|
| branding | Branding |
| design | Design |
| web_design | Web design |
| digital_marketing | Digital marketing / SEO / PPC |
| seo | Digital marketing / SEO / PPC |
| ppc | Digital marketing / SEO / PPC |
| motion | Design (closest fit) |
| ecommerce_agency | Ecommerce agency / beauty marketing |
| beauty_marketing | Ecommerce agency / beauty marketing |
