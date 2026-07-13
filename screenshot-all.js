const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pages = [
    ['/tools/ar-roi', 'v2-roi'],
    ['/changelog', 'v2-changelog'],
    ['/', 'v2-home'],
    ['/dashboard/cash-flow', 'v2-cashflow'],
  ];
  for (const [path, name] of pages) {
    await page.goto('http://localhost:3030' + path, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/' + name + '.png', fullPage: false });
    console.log('OK:', path);
  }
  await browser.close();
})();
