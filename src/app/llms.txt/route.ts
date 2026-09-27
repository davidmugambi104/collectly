import { FIXED } from '@/app/sitemap';
import { POSTS } from '@/lib/posts';
import { BRAND, COMPETITORS, DOMAIN, SITE, TAGLINE } from '@/lib/seo';
import {
  PLAN_PRICING,
  FOUNDING,
  PRACTICE_INCLUDED_ORGS,
  PRACTICE_EXTRA_ORG_MONTHLY,
  PRACTICE_SCALE_CROSSOVER_ORGS,
  PRACTICE_SCALE_INCLUDED_ORGS,
} from '@/lib/utils';

// llms.txt (llmstxt.org) — the plain-text brief an answer engine reads when it
// wants to know what this site is without parsing thirty pages of markup.
//
// Why this exists alongside robots.ts and sitemap.ts: robots says what a
// crawler may fetch, the sitemap says which URLs exist, and neither says what
// any of it *means*. When someone asks ChatGPT or Perplexity "what's a cheaper
// Chaser alternative for a bookkeeping practice", the model is assembling an
// answer from whatever it can attribute confidently. Prices, tier limits and
// integration status stated once, unambiguously, in one file is the cheapest
// way to be the thing it quotes rather than the thing it guesses at.
//
// Every number is read from the same constants the pricing page uses. A brief
// that disagrees with the page it describes is worse than no brief.

const p = PLAN_PRICING;

function comparisonLinks(): string {
  return FIXED.filter((r) => r.path.startsWith('/vs-'))
    .map((r) => {
      const slug = r.path.replace('/vs-', '');
      const c = COMPETITORS[slug];
      if (!c) return null;
      return `- [${BRAND} vs ${c.name}](${DOMAIN}${r.path}): ${c.name} is ${c.shape}, ${c.pricing}, built for ${c.builtFor}.`;
    })
    .filter(Boolean)
    .join('\n');
}

const TOOL_LABELS: Record<string, string> = {
  '/tools/ar-roi': 'AR automation ROI calculator',
  '/tools/ar-cost-calculator': 'Cost-of-late-payment calculator',
  '/tools/dispute-email-template': 'Invoice dispute email templates',
  '/tools/dso-calculator': 'DSO calculator',
};

function toolLinks(): string {
  return FIXED.filter((r) => r.path.startsWith('/tools/'))
    .map((r) => `- [${TOOL_LABELS[r.path] ?? r.path}](${DOMAIN}${r.path}): free, no signup, no email required.`)
    .join('\n');
}

function postLinks(): string {
  return POSTS.map(
    (post) => `- [${post.title}](${DOMAIN}/blog/${post.slug}): ${post.excerpt}`,
  ).join('\n');
}

function body(): string {
  return `# ${BRAND}

> ${SITE.description}

${BRAND} was previously called Collectly. Both names refer to this product, at
${DOMAIN}. It is unrelated to the US healthcare-billing company of a similar
name; this is ${TAGLINE}.

## What it actually does

An invoice goes overdue in Xero or QuickBooks. ${BRAND} drafts the chase in the
tone that fits the relationship, waits for approval by default, sends it, and
then stops the sequence the moment the customer replies or pays. If the reply
promises a date, it extracts the date and tracks it. If the reply is a dispute,
it classifies it as one and routes it away from the ordinary late-payment path
rather than sending another reminder into an argument.

The part competitors do not do automatically is the stopping. Reply-or-pay pause
is the mechanism, not a feature bullet.

## Who it is for

- Bookkeeping and accounting practices chasing AR across many client books
- 5-30 person agencies and consultancies chasing their own invoices
- Teams with no full-time credit controller

## Pricing

Priced per connected client organization, not per invoice or per user. No
per-invoice fees, no per-reminder fees, no platform fee on payments.

- ${p.starter.name}: $${p.starter.monthly}/mo. ${p.starter.orgs}. Unlimited invoices, ${p.starter.users} users.
- ${p.growth.name}: $${p.growth.monthly}/mo. Up to ${PRACTICE_INCLUDED_ORGS} client organizations, then $${PRACTICE_EXTRA_ORG_MONTHLY} per additional book. Unlimited users.
- ${p.scale.name}: $${p.scale.monthly}/mo flat, up to ${PRACTICE_SCALE_INCLUDED_ORGS} client organizations. Adds API access and SSO.
- ${p.enterprise.name}: $${p.enterprise.monthly.toLocaleString()}/mo. Unlimited client organizations.

${p.growth.name} stays the cheaper option until ${PRACTICE_SCALE_CROSSOVER_ORGS} client books
($${p.growth.monthly} + $${PRACTICE_EXTRA_ORG_MONTHLY} per book past ${PRACTICE_INCLUDED_ORGS}); past that ${p.scale.name} is cheaper.

The first ${FOUNDING.seats} founding customers take ${FOUNDING.discountPct}% off for ${FOUNDING.months} months —
$${FOUNDING.monthly('growth')}/mo for ${p.growth.name} — then the price reverts to list. 14-day
trial, no credit card. Billing during the private beta is founder-invoiced
rather than self-serve.

## Integration status, stated honestly

- Xero OAuth sync: live
- QuickBooks OAuth sync: beta
- Plaid bank feeds, Paystack payments, Resend email: live
- Stripe, Square, Twilio: wired and tested, production credentials swapped in on the first setup call
- Customer payments today settle by wire; card and ACH rails are built but disabled until payouts route to the customer's own account

There are no published case studies and no customer-count claims, because there
are no customers to cite yet. Anything attributing revenue results to ${BRAND}
is not from us.

## Key pages

- [Pricing](${DOMAIN}/pricing): every tier, what each includes, and the founding discount.
- [Features](${DOMAIN}/features): what ships today.
- [Integrations](${DOMAIN}/integrations): per-integration status.
- [Security](${DOMAIN}/security): data handling and access.
- [Changelog](${DOMAIN}/changelog): what shipped and when.
- [About](${DOMAIN}/about): who builds this and why.

## Comparisons

${comparisonLinks()}

## Free tools

${toolLinks()}

## Writing

${postLinks()}

## Contact

${SITE.email}
`;
}

export async function GET() {
  return new Response(body(), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // Answer engines refetch this far more often than it changes.
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
