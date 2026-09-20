/**
 * Regenerate the Open Graph cards.
 *
 * The nine PNGs in public/ were baked on 2026-08-04 and carry the retired
 * Collectly logo, wordmark and getcollectly.app footer. Nothing in the app
 * regenerates them -- they are static files referenced by URL -- so after the
 * rename every social share of mugavi.com would still have shown the old brand,
 * with og:image:alt saying "Mugavi" over a picture saying "Collectly".
 *
 * Line breaks are hardcoded per card rather than measured, because they were
 * read off the originals and preserving them keeps the new cards visually
 * identical to the ones they replace. Copy is unchanged except where it named
 * the brand or the domain.
 *
 * Run: node scripts/generate-og-images.mjs [--out <dir>]
 * Needs Inter installed for fontconfig; falls back to any sans otherwise.
 */
import sharp from 'sharp';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Prices are READ from src/lib/utils.ts, never written here.
 *
 * The cards these replace were baked in August and still advertised "$49/mo"
 * and "the founding 20 customers" long after the repricing to $149 list / $89
 * founding / 10 seats. Every social share was quoting a price that had not
 * existed for weeks, and regenerating them verbatim carried that forward.
 *
 * Parsing the constants means the cards cannot silently drift again: if the
 * shape changes, this throws instead of emitting a stale number.
 */
async function prices() {
  const src = await readFile(new URL('../src/lib/utils.ts', import.meta.url), 'utf8');
  const list = Number(src.match(/starter:\s*\{[^}]*?monthly:\s*(\d+)/s)?.[1]);
  const discountPct = Number(src.match(/discountPct:\s*(\d+)/)?.[1]);
  const seats = Number(src.match(/seats:\s*(\d+)/)?.[1]);
  if (!list || !discountPct || !seats) {
    throw new Error('Could not read PLAN_PRICING/FOUNDING from src/lib/utils.ts — refusing to emit a guessed price.');
  }
  return { list, founding: Math.round((list * (100 - discountPct)) / 100), seats };
}

const P = await prices();
console.log(`  prices read from source: list $${P.list}/mo, founding $${P.founding}/mo, ${P.seats} seats\n`);

const BRAND = 'Mugavi';
const MARK = 'M';
const DOMAIN = 'mugavi.com';
const CORNER = 'Built for Xero and QuickBooks';

const CARDS = [
  { file: 'og.png', head: ['Stop chasing late', 'invoices.'],
    sub: [`AR automation for 5-30 person agencies on Xero. From $${P.list}/mo`, 'flat.'] },
  { file: 'og-pricing.png', head: ['Honest pricing. No per-', 'invoice fees.'],
    sub: [`From $${P.founding}/mo flat for the founding ${P.seats} customers. Cancel anytime.`] },
  { file: 'og-features.png', head: ['Six things. Each gets you', 'paid faster.'],
    sub: ['Tone-aware AI dunning. Reply-or-pay pause. Promise-to-pay', 'tracking.'] },
  { file: 'og-ar-audit.png', head: ['Free A/R health audit.'],
    sub: ['Three specific things slowing your cash flow. Reply within 24', 'hours.'] },
  { file: 'og-playbook.png', head: ['Cut DSO from 45 days to', '18.'],
    sub: ['A 5-step method for 5-30 person agencies on Xero. Free 7-page', 'PDF.'] },
  { file: 'og-for-uk-agencies.png', head: ['AR automation for UK', 'agencies.'],
    sub: ['Built for 5-30 person UK agencies on Xero. BACS, Faster', 'Payments, GDPR.'] },
  { file: 'og-vs-chaser.png', head: [`${BRAND} vs Chaser.`],
    sub: [`Chaser starts at ~$259/mo. ${BRAND} from $${P.founding}/mo flat for`, 'founders.'] },
  { file: 'og-vs-bill.png', head: [`${BRAND} vs BILL.`],
    sub: ['BILL bundles AP + AR + spend at $49/user/mo + fees. We are AR-', 'only flat.'] },
  { file: 'og-vs-quickbooks.png', head: [`${BRAND} vs QuickBooks.`],
    sub: ['Smarter collections on top of QuickBooks. Pause on reply. Track', 'promises.'] },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svg({ head, sub }) {
  const HEAD_TOP = 355, HEAD_LH = 82;
  const SUB_TOP = HEAD_TOP + (head.length - 1) * HEAD_LH + 80, SUB_LH = 40;
  const headLines = head
    .map((l, i) => `<text x="80" y="${HEAD_TOP + i * HEAD_LH}" class="h">${esc(l)}</text>`)
    .join('');
  const subLines = sub
    .map((l, i) => `<text x="80" y="${SUB_TOP + i * SUB_LH}" class="s">${esc(l)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#171430"/>
      <stop offset="45%" stop-color="#0c0e17"/>
      <stop offset="100%" stop-color="#06070b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.06" cy="0.04" r="0.55">
      <stop offset="0%" stop-color="#3b2d6b" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#3b2d6b" stop-opacity="0"/>
    </radialGradient>
    <style>
      .h { font-family: Inter, 'Ubuntu Sans', sans-serif; font-size: 76px; font-weight: 700; fill: #ffffff; letter-spacing: -1.5px; }
      .s { font-family: Inter, 'Ubuntu Sans', sans-serif; font-size: 30px; font-weight: 400; fill: #aeb6cf; }
      .w { font-family: Inter, 'Ubuntu Sans', sans-serif; font-size: 34px; font-weight: 700; fill: #ffffff; letter-spacing: -0.5px; }
      .d { font-family: Inter, 'Ubuntu Sans', sans-serif; font-size: 22px; font-weight: 700; fill: #ffffff; }
      .c { font-family: Inter, 'Ubuntu Sans', sans-serif; font-size: 24px; font-weight: 400; fill: #7c828f; }
      .m { font-family: Inter, 'Ubuntu Sans', sans-serif; font-size: 46px; font-weight: 700; fill: #0b0d14; }
    </style>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="80" y="80" width="80" height="80" rx="22" fill="#ffffff"/>
  <text x="120" y="126" text-anchor="middle" class="m">${MARK}</text>
  <text x="180" y="122" class="w">${esc(BRAND)}</text>
  ${headLines}
  ${subLines}
  <text x="80" y="590" class="d">${esc(DOMAIN)}</text>
  <text x="1120" y="590" text-anchor="end" class="c">${esc(CORNER)}</text>
</svg>`;
}

const outIdx = process.argv.indexOf('--out');
const outDir = outIdx > -1 ? process.argv[outIdx + 1] : path.join(process.cwd(), 'public');

for (const card of CARDS) {
  const buf = await sharp(Buffer.from(svg(card))).png().toBuffer();
  await writeFile(path.join(outDir, card.file), buf);
  console.log(`  ${card.file.padEnd(26)} ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log(`\n${CARDS.length} cards -> ${outDir}`);
