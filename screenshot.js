const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const targets = [
    ['home', 'http://localhost:3030/'],
    ['pricing', 'http://localhost:3030/pricing'],
    ['features', 'http://localhost:3030/features'],
    ['blog', 'http://localhost:3030/blog'],
    ['customers', 'http://localhost:3030/customers'],
  ];
  for (const [name, url] of targets) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: `/tmp/collectly-${name}.png`, fullPage: true });
    console.log(name, '→', await page.title());
  }
  await browser.close();
})();
