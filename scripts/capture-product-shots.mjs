/**
 * Regenerate the marketing screenshots in public/product/.
 *
 * These are real captures of the running app, so they go stale whenever the
 * dashboard moves. Without a script they get re-taken by hand, inconsistently,
 * or never — which is how a marketing site ends up showing a UI that shipped
 * two redesigns ago.
 *
 *   USE_PGLITE=1 USE_DEV_AUTH=1 NEXT_PUBLIC_USE_DEV_AUTH=1 npx next dev -p 3213
 *   node scripts/capture-product-shots.mjs
 *
 * The org captured is the dev seed. bootstrap-db.ts requires a visible
 * sample-data label on anything published from it; product-showcase.tsx puts
 * that label in the frame chrome.
 *
 * The cash-flow crop needs GEMINI_API_KEY set. Without it the page falls back to
 * a deterministic baseline and prints "AI forecast unavailable", which is a
 * local-environment state rather than product behaviour — capturing it would
 * misrepresent the page. With a key the crop runs to the foot of the chart card
 * so the AI analysis line is included, because then it is real.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'product');
const BASE = process.env.SHOT_BASE_URL ?? 'http://localhost:3213';

/** width/height here must match the `width`/`height` props in product-showcase.tsx. */
const SHOTS = [
  { name: 'dashboard', path: '/dashboard', crop: null, width: 2160 },
  { name: 'inbox', path: '/dashboard/inbox', crop: { left: 500, top: 470, width: 2330, height: 980 }, width: 1400 },
  // 540..1520 is the chart card exactly: bars plus the AI analysis line,
  // stopping before the separate methodology card below it.
  { name: 'cashflow', path: '/dashboard/cash-flow', crop: { left: 500, top: 540, width: 2330, height: 980 }, width: 1400 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
// The Next dev-tools bubble is fixed bottom-left, on top of the sidebar's
// trial meter. It is not part of the product.
await ctx.addInitScript(() => {
  const css = 'nextjs-portal,[data-nextjs-toast],#__next-build-watcher{display:none!important}';
  const add = () => {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  };
  if (document.head) add();
  else document.addEventListener('DOMContentLoaded', add);
});

const page = await ctx.newPage();
let failed = 0;

for (const shot of SHOTS) {
  const res = await page.goto(BASE + shot.path, { waitUntil: 'networkidle', timeout: 60_000 });
  if (!res || res.status() !== 200) {
    console.error(`  FAIL ${shot.name}: HTTP ${res ? res.status() : 'no response'}`);
    failed += 1;
    continue;
  }
  await page.waitForTimeout(1800);
  const png = await page.screenshot();
  let img = sharp(png);
  if (shot.crop) img = img.extract(shot.crop);
  const info = await img.resize({ width: shot.width }).webp({ quality: 84 }).toFile(join(OUT, `${shot.name}.webp`));
  console.log(`  ${shot.name}: ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
  console.log(`    -> product-showcase.tsx must declare width={${info.width}} height={${info.height}}`);
}

await browser.close();
if (failed > 0) process.exit(1);
