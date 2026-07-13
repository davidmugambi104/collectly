const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  // Dashboard with data (current state)
  await page.goto('http://localhost:3030/dashboard', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/p1-dashboard-data.png', fullPage: false });
  console.log('OK: dashboard with data');
  // Scroll down to AI insights + top risk
  await page.evaluate(() => window.scrollTo(0, 350));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/p1-dashboard-mid.png', fullPage: false });
  console.log('OK: dashboard mid-scroll (AI insights)');
  // Customer detail
  const customerLink = await page.$('a[href^="/dashboard/customers/"][href*="acme" i], a[href^="/dashboard/customers/"]');
  if (customerLink) {
    await customerLink.click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/p1-customer-detail.png', fullPage: false });
    console.log('OK: customer detail');
  }
  // Integrations
  await page.goto('http://localhost:3030/dashboard/integrations', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/p1-integrations.png', fullPage: false });
  console.log('OK: integrations');
  // Cash flow
  await page.goto('http://localhost:3030/dashboard/cash-flow', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/p1-cashflow.png', fullPage: false });
  console.log('OK: cash flow');
  // Dunning
  await page.goto('http://localhost:3030/dashboard/dunning', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/p1-dunning.png', fullPage: false });
  console.log('OK: dunning');
  await browser.close();
})();
