#!/usr/bin/env node
/**
 * render-logo.js
 *
 * Generates logo assets from src/components/brand/logo.tsx:
 *  - screenshots/launch/logo-240.png  (240x240 transparent, PH gallery thumbnail)
 *  - screenshots/launch/logo-480.png  (480x480 transparent, retina)
 *  - screenshots/launch/logo-light.png (240x240 white-on-transparent, for dark UIs)
 *  - screenshots/launch/og-card-1200x630.png (Twitter/OG card: icon + tagline + URL)
 *
 * Uses playwright to render an HTML wrapper that inlines the SVG, then screenshots it.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'screenshots', 'launch');
fs.mkdirSync(OUT, { recursive: true });

// The exact SVG from src/components/brand/logo.tsx, inlined
const ICON_SVG = `<svg viewBox="0 0 32 32" fill="none" aria-label="Collectly">
  <rect x="2" y="2" width="28" height="28" rx="7" fill="#0a0b0f" />
  <path d="M9 16.5 13.5 21 23 11.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="23" cy="11.5" r="1.4" fill="#10b981" stroke="white" stroke-width="0.8" />
</svg>`;

const ICON_LIGHT_SVG = `<svg viewBox="0 0 32 32" fill="none" aria-label="Collectly">
  <rect x="2" y="2" width="28" height="28" rx="7" fill="white" />
  <path d="M9 16.5 13.5 21 23 11.5" stroke="#0a0b0f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="23" cy="11.5" r="1.4" fill="#10b981" stroke="#0a0b0f" stroke-width="0.8" />
</svg>`;

function htmlPage(svg, w, h, bg = 'transparent') {
  return `<!doctype html><html><head><style>
    html, body { margin: 0; padding: 0; background: ${bg}; }
    .wrap { width: ${w}px; height: ${h}px; display: flex; align-items: center; justify-content: center; }
    .wrap > svg { width: ${Math.min(w, h) * 0.85}px; height: ${Math.min(w, h) * 0.85}px; }
  </style></head><body><div class="wrap">${svg}</div></body></html>`;
}

function ogCardHtml() {
  // 1200x630 — PH / Twitter / OG card with tagline + URL
  return `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;900&display=swap" rel="stylesheet">
  <style>
    html, body { margin: 0; padding: 0; }
    .card { width: 1200px; height: 630px; background: linear-gradient(135deg, #0a0b0f 0%, #1a1c24 50%, #0a0b0f 100%); display: flex; align-items: center; padding: 80px; box-sizing: border-box; font-family: 'Inter', system-ui, sans-serif; color: white; position: relative; overflow: hidden; }
    .card::before { content: ''; position: absolute; top: -200px; right: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%); border-radius: 50%; }
    .card::after { content: ''; position: absolute; bottom: -200px; left: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%); border-radius: 50%; }
    .left { position: relative; z-index: 1; }
    .icon { width: 120px; height: 120px; }
    .name { margin-top: 32px; font-size: 28px; font-weight: 600; color: #94a3b8; letter-spacing: -0.01em; }
    .tagline { margin-top: 8px; font-size: 76px; font-weight: 900; line-height: 1.05; letter-spacing: -0.03em; max-width: 900px; }
    .tagline .accent { background: linear-gradient(90deg, #10b981 0%, #6366f1 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .url { margin-top: 40px; font-size: 26px; font-weight: 600; color: #10b981; letter-spacing: -0.01em; }
  </style></head>
  <body><div class="card">
    <div class="left">
      ${ICON_SVG.replace('<svg', '<svg class="icon"')}
      <div class="name">Collectly</div>
      <div class="tagline">Get paid <span class="accent">3× faster</span>.<br/>Without chasing invoices.</div>
      <div class="url">collectly.com</div>
    </div>
  </div></body></html>`;
}

async function snapTransparent(browser, html, outFile, w, h) {
  // Use chromium with transparent page background (only works for the body, not the html element,
  // but the body inherits transparent so PNGs come out with alpha).
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  // Allow web fonts to settle (only relevant for og-card)
  await page.waitForTimeout(500);
  // OmitBackground makes the PNG transparent
  await page.screenshot({ path: outFile, omitBackground: true, fullPage: false, clip: { x: 0, y: 0, width: w, height: h } });
  await ctx.close();
  const size = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`✓ ${outFile.replace(OUT + '/', '')}  (${w}×${h}, ${size}KB)`);
}

(async () => {
  const browser = await chromium.launch();

  // Logo variants
  await snapTransparent(browser, htmlPage(ICON_SVG, 240, 240), path.join(OUT, 'logo-240.png'), 240, 240);
  await snapTransparent(browser, htmlPage(ICON_SVG, 480, 480), path.join(OUT, 'logo-480.png'), 480, 480);
  await snapTransparent(browser, htmlPage(ICON_LIGHT_SVG, 240, 240), path.join(OUT, 'logo-light.png'), 240, 240);

  // OG card (NOT transparent — has its own gradient bg)
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(ogCardHtml(), { waitUntil: 'load' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'og-card-1200x630.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  const ogSize = (fs.statSync(path.join(OUT, 'og-card-1200x630.png')).size / 1024).toFixed(1);
  console.log(`✓ og-card-1200x630.png  (1200×630, ${ogSize}KB)`);
  await ctx.close();

  await browser.close();
  console.log('\nAll assets written to', OUT);
})();
