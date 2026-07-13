const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const targets = [
    ['home', 'http://localhost:3030/'],
    ['pricing', 'http://localhost:3030/pricing'],
    ['features', 'http://localhost:3030/features'],
    ['dashboard-overview', 'http://localhost:3030/dashboard'],
    ['dashboard-invoices', 'http://localhost:3030/dashboard/invoices'],
    ['dashboard-invoice-detail', 'http://localhost:3030/dashboard/invoices/ft7hgkuo26ks'],
    ['dashboard-customer-detail', 'http://localhost:3030/dashboard/customers/hc7pltpesuyv'],
    ['dashboard-dunning', 'http://localhost:3030/dashboard/dunning'],
    ['dashboard-cash-flow', 'http://localhost:3030/dashboard/cash-flow'],
    ['dashboard-integrations', 'http://localhost:3030/dashboard/integrations'],
    ['dashboard-billing', 'http://localhost:3030/dashboard/billing'],
    ['pay-portal', 'http://localhost:3030/pay/ft7hgkuo26ks'],
  ];
  for (const [name, url] of targets) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `/tmp/c-${name}.png`, fullPage: true });
      console.log(name, '✓', await page.title());
    } catch (e) { console.log(name, '✗', e.message); }
  }
  await browser.close();
})();
