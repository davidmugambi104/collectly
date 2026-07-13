const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3030/tools/ar-roi', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/final-roi.png', fullPage: false });
  console.log('OK: /tools/ar-roi');
  await page.goto('http://localhost:3030/', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/final-home-v2.png', fullPage: false });
  console.log('OK: /');
  await browser.close();
})();
