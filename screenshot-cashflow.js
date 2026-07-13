const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3030/dashboard/cash-flow', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/final-cashflow-v2.png', fullPage: false });
  console.log('OK');
  await browser.close();
})();
