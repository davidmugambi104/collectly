const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const targets = [
    ['blog-index', 'http://localhost:3030/blog'],
    ['blog-post', 'http://localhost:3030/blog/best-dunning-templates-2026'],
  ];
  for (const [name, url] of targets) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `/tmp/c-${name}.png`, fullPage: true });
      console.log(name, '✓');
    } catch (e) { console.log(name, '✗', e.message); }
  }
  await browser.close();
})();
