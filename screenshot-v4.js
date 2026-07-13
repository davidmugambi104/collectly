const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  const captures = [
    ['/dashboard', 'v4-dashboard-top'],
    ['/dashboard/customers', 'v4-customers'],
    ['/dashboard/dunning', 'v4-dunning'],
    ['/dashboard/cash-flow', 'v4-cashflow'],
    ['/dashboard/integrations', 'v4-integrations'],
  ];
  for (const [path, name] of captures) {
    await page.goto('http://localhost:3030' + path, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: '/tmp/' + name + '.png', fullPage: false });
    console.log('OK:', path);
  }
  // Dashboard mid-scroll to see AI insights
  await page.goto('http://localhost:3030/dashboard', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 350));
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/v4-dashboard-ai.png', fullPage: false });
  console.log('OK: dashboard with AI insights');
  // Customer detail
  await page.goto('http://localhost:3030/dashboard/customers', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);
  const firstCustomer = await page.$('a[href^="/dashboard/customers/"][href*="/customers/"]');
  if (firstCustomer) {
    await firstCustomer.click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/v4-customer-detail.png', fullPage: false });
    console.log('OK: customer detail');
  }
  await browser.close();
})();
