// scripts/build-og.mjs
//
// Generates static OG / Twitter / Facebook share cards at 1200x630.
// Run before each deploy if you've added/changed a key landing page.
//
// Usage:
//   node scripts/build-og.mjs                       # default card only
//   node scripts/build-og.mjs --all                # default + per-page cards
//
// Outputs to public/og-<slug>.png. To use a card on a page, override
// `image` in pageMetadata() to '/og-<slug>.png'.

import { chromium } from 'patchright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Cards to generate. 'default' lands at /og.png and is the fallback for any
// page that doesn't specify its own image. The rest are per-page cards for
// the highest-traffic landing pages; they sharpen the SERP/Feed experience
// for shared URLs and provide better CTR from social referrals.
//
// Add a card here when a page meets two of:
//   - ranks for >5 high-intent commercial queries
//   - gets shared to LinkedIn / X / Slack by customers and prospects
//   - is a top-of-funnel landing page (free tool, comparison, vertical)
const CARDS = [
  {
    slug: 'default',
    title: 'Stop chasing late invoices.',
    sub: 'AR automation for 5-30 person agencies on Xero. From $49/mo flat.',
  },
  {
    slug: 'pricing',
    title: 'Honest pricing. No per-invoice fees.',
    sub: 'From $49/mo flat for the founding 20 customers. Cancel anytime.',
  },
  {
    slug: 'features',
    title: 'Six things. Each gets you paid faster.',
    sub: 'Tone-aware AI dunning. Reply-or-pay pause. Promise-to-pay tracking.',
  },
  {
    slug: 'vs-chaser',
    title: 'Collectly vs Chaser.',
    sub: 'Chaser starts at ~$259/mo. Collectly from $49/mo flat for founders.',
  },
  {
    slug: 'vs-bill',
    title: 'Collectly vs BILL.',
    sub: 'BILL bundles AP + AR + spend at $49/user/mo + fees. We are AR-only flat.',
  },
  {
    slug: 'vs-quickbooks',
    title: 'Collectly vs QuickBooks.',
    sub: 'Smarter collections on top of QuickBooks. Pause on reply. Track promises.',
  },
  {
    slug: 'for-uk-agencies',
    title: 'AR automation for UK agencies.',
    sub: 'Built for 5-30 person UK agencies on Xero. BACS, Faster Payments, GDPR.',
  },
  {
    slug: 'playbook',
    title: 'Cut DSO from 45 days to 18.',
    sub: 'A 5-step method for 5-30 person agencies on Xero. Free 7-page PDF.',
  },
  {
    slug: 'ar-audit',
    title: 'Free A/R health audit.',
    sub: 'Three specific things slowing your cash flow. Reply within 24 hours.',
  },
];

function html(title, sub) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; background: #0a0b0f; color: #fff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .card { width: 1200px; height: 630px; display: flex; flex-direction: column;
    padding: 80px; box-sizing: border-box; background:
      radial-gradient(1200px 600px at 0% 0%, rgba(99,102,241,0.22), transparent 60%),
      radial-gradient(800px 400px at 100% 100%, rgba(16,185,129,0.18), transparent 60%),
      #0a0b0f; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 30px;
    font-weight: 700; letter-spacing: -0.02em; }
  .brand .logo { width: 56px; height: 56px; background: #fff; border-radius: 14px;
    display:flex; align-items:center; justify-content:center; color:#0a0b0f; font-size:36px; font-weight:900; }
  .title { margin-top: 160px; font-size: 76px; line-height: 1.05; font-weight: 800;
    letter-spacing: -0.03em; max-width: 1040px; }
  .sub { margin-top: 40px; font-size: 30px; line-height: 1.35; color: #c7c9d1;
    max-width: 1000px; font-weight: 400; }
  .footer { margin-top: auto; display: flex; justify-content: space-between;
    align-items: center; color: #8b8d97; font-size: 22px; }
  .url { font-weight: 700; color: #fff; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand"><div class="logo">C</div><span>Collectly</span></div>
    <div class="title">${escapeHtml(title)}</div>
    <div class="sub">${escapeHtml(sub)}</div>
    <div class="footer">
      <span class="url">getcollectly.app</span>
      <span>Built for Xero and QuickBooks</span>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function render(browser, card) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(html(card.title, card.sub), { waitUntil: 'networkidle' });
  const png = await page.screenshot({ type: 'png', omitBackground: false });
  const fileName = card.slug === 'default' ? 'og.png' : `og-${card.slug}.png`;
  const outPath = resolve(ROOT, 'public', fileName);
  writeFileSync(outPath, png);
  await ctx.close();
  console.log(`wrote ${outPath}`);
}

async function main() {
  const all = process.argv.includes('--all');
  const targets = all ? CARDS : CARDS.filter((c) => c.slug === 'default');
  mkdirSync(resolve(ROOT, 'public'), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const card of targets) {
      await render(browser, card);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
