const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3030/dashboard/admin/interviews', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/int-admin.png', fullPage: false });
  console.log('OK: admin interviews');
  await page.goto('http://localhost:3030/dashboard/admin/interviews?tag=icp', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/int-icp.png', fullPage: false });
  console.log('OK: ICP filter');
  await browser.close();
})();
