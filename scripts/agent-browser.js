#!/usr/bin/env node
/**
 * Headless Chrome driver for OpenClaw agent.
 *
 * What it does:
 *   1. Launches Chromium with CDP enabled
 *   2. Navigates to a URL
 *   3. Takes a screenshot
 *   4. Dumps the page HTML + form/button counts
 *   5. Returns a JSON report
 *
 * What it does NOT do:
 *   - Sign in to anything (no cookies, no sessions, no credentials)
 *   - Receive verification codes
 *   - Tap 2FA prompts
 *   - Agree to ToS
 *
 * It can verify pages LOAD and FORMS are present, but cannot
 * complete sign-in flows on its own.
 */
const { chromium } = require('/home/davie/.openclaw/workspace/collectly/node_modules/playwright');
const fs = require('fs');

const URL = process.argv[2] || 'about:blank';
const OUT = process.argv[3] || '/tmp/page-screenshot.png';
const PROFILE = process.env.CHROME_PROFILE || '/tmp/chrome-agent-profile';

function findChrome() {
  // 1. Playwright bundled (works in WSL, no X needed)
  const pwBrowsers = '/home/davie/.cache/ms-playwright';
  if (fs.existsSync(pwBrowsers)) {
    const dirs = fs.readdirSync(pwBrowsers).filter(d => d.startsWith('chromium-') && !d.includes('shell'));
    for (const d of dirs) {
      // Newer Playwright uses chrome-linux64, older uses chrome-linux
      const candidates = [
        `${pwBrowsers}/${d}/chrome-linux64/chrome`,
        `${pwBrowsers}/${d}/chrome-linux/chrome`,
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  // 2. System Chrome
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  for (const c of candidates) {
    try { if (fs.statSync(c).isFile()) return c; } catch {}
  }
  return null;
}

async function main() {
  fs.mkdirSync(PROFILE, { recursive: true });

  const exePath = findChrome();
  if (!exePath) {
    console.error(JSON.stringify({ error: 'No Chrome binary found. Run: npx playwright install chromium' }));
    process.exit(1);
  }
  console.error(`Using Chrome: ${exePath}`);

  const browser = await chromium.launchPersistentContext(PROFILE, {
    executablePath: exePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    viewport: { width: 1280, height: 800 },
  });

  const page = browser.pages()[0] || await browser.newPage();

  try {
    const resp = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT, fullPage: true });
    const title = await page.title();
    const url = page.url();
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const forms = await page.locator('form').count();
    const visibleText = (await page.locator('body').textContent() || '').slice(0, 1500);

    const report = {
      ok: true,
      requestedUrl: URL,
      finalUrl: url,
      httpStatus: resp ? resp.status() : null,
      title,
      domCounts: { buttons, inputs, forms },
      visibleTextPreview: visibleText,
      screenshotPath: OUT,
      screenshotBytes: fs.statSync(OUT).size,
    };
    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e.message, screenshotPath: OUT }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
