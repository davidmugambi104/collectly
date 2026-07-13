const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warn') console.log('CONSOLE:', m.type(), m.text()); });
  await page.goto('http://localhost:3030/dashboard', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  console.log('Body (first 400):', (await page.evaluate(() => document.body.innerText)).slice(0, 400));
  await browser.close();
})();
