#!/usr/bin/env node
/**
 * capture-launch-assets.js
 *
 * Re-captures the 5 PNG screenshots + 1 GIF used in the Product Hunt launch kit.
 * Captures against the local PGlite dev DB with seeded data.
 *
 * Usage:
 *   USE_DEV_AUTH=1 USE_PGLITE=1 npx next dev -p 3030 &   # in another shell
 *   curl -X POST http://localhost:3030/api/seed-sample
 *   node scripts/capture-launch-assets.js
 *
 * Requires (devDependencies): playwright, gifenc, pngjs
 */
const { chromium } = require('playwright');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3030';
const OUT = path.resolve(__dirname, '..', 'screenshots', 'launch');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { file: '01-dashboard-overview.png',     url: '/dashboard' },
  { file: '02-dunning-sequence.png',       url: '/dashboard/dunning' },
  { file: '03-cash-flow-forecast.png',     url: '/dashboard/cash-flow' },
  { file: '04-ar-aging.png',               url: '/dashboard/invoices?filter=overdue' },
];

const VIEWPORT = { width: 1280, height: 800 };

(async () => {
  const browser = await chromium.launch();

  // 1) Static screenshots
  const page = await browser.newPage({ viewport: VIEWPORT });
  for (const s of SHOTS) {
    process.stdout.write(`snap ${s.file} ... `);
    await page.goto(BASE + s.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, s.file), fullPage: true });
    console.log('ok');
  }

  // 2) Payment portal (need a real invoice id)
  await page.goto(BASE + '/dashboard/invoices?filter=overdue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const firstLink = await page.$('a[href*="/dashboard/invoices/"]');
  if (!firstLink) throw new Error('No invoice link found on overdue list — is the seed loaded?');
  const href = await firstLink.getAttribute('href');
  const invId = href.split('/').pop();
  process.stdout.write(`snap 05-payment-portal.png (inv=${invId}) ... `);
  await page.goto(`${BASE}/pay/${invId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '05-payment-portal.png'), fullPage: true });
  console.log('ok');

  // 3) GIF — dashboard → invoices → invoice detail → payment portal
  process.stdout.write('recording 06-invoice-overdue-to-payment.gif ... ');
  const gifFrames = [];
  async function snap() {
    const buf = await page.screenshot({ type: 'png' });
    gifFrames.push(buf);
  }
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await snap();
  await page.goto(BASE + '/dashboard/invoices?filter=overdue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await snap();
  await firstLink.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await snap();
  await page.goto(`${BASE}/pay/${invId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await snap();

  const enc = GIFEncoder();
  for (const buf of gifFrames) {
    const png = PNG.sync.read(buf);
    const palette = quantize(png.data, 256, { format: 'rgb444' });
    const idx = applyPalette(png.data, palette, 'rgb444');
    enc.writeFrame(idx, png.width, png.height, { palette, delay: 1200 });
  }
  enc.finish();
  fs.writeFileSync(path.join(OUT, '06-invoice-overdue-to-payment.gif'), enc.bytes());
  console.log('ok', `(${(fs.statSync(path.join(OUT, '06-invoice-overdue-to-payment.gif')).size / 1024).toFixed(0)}KB)`);

  await browser.close();
  console.log('\nAll assets written to', OUT);
})();
