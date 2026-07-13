const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  const captures = [
    ['/dashboard', 'v5-dashboard-top'],
    ['/dashboard/invoices', 'v5-invoices'],
    ['/dashboard/invoices?filter=overdue', 'v5-invoices-overdue'],
    ['/dashboard/customers', 'v5-customers'],
    ['/dashboard/dunning', 'v5-dunning'],
    ['/dashboard/dunning/sequence', 'v5-dunning-seq'],
    ['/dashboard/cash-flow', 'v5-cashflow'],
    ['/dashboard/payments', 'v5-payments'],
    ['/dashboard/integrations', 'v5-integrations'],
    ['/dashboard/settings', 'v5-settings'],
    ['/dashboard/billing', 'v5-billing'],
  ];
  for (const [path, name] of captures) {
    await page.goto('http://localhost:3030' + path, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: '/tmp/' + name + '.png', fullPage: false });
    console.log('OK:', path);
  }
  // Dashboard with AI insights
  await page.goto('http://localhost:3030/dashboard', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/v5-dashboard-ai.png', fullPage: false });
  console.log('OK: dashboard with AI insights');
  // Customer detail
  await page.goto('http://localhost:3030/dashboard/customers', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);
  const firstCustomer = await page.$('a[href^="/dashboard/customers/"][href*="/customers/"]');
  if (firstCustomer) {
    await firstCustomer.click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/v5-customer-detail.png', fullPage: false });
    console.log('OK: customer detail');
  }
  // Invoice detail
  await page.goto('http://localhost:3030/dashboard/invoices?filter=overdue', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);
  const firstInvoice = await page.$('a[href^="/dashboard/invoices/"][href*="dashboard/invoices/"]');
  if (firstInvoice) {
    await firstInvoice.click();
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/v5-invoice-detail.png', fullPage: false });
    console.log('OK: invoice detail');
  }
  await browser.close();
})();
