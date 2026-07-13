const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pages = [
    ['/', 'final-home'],
    ['/pricing', 'final-pricing'],
    ['/features', 'final-features'],
    ['/blog', 'final-blog'],
    ['/blog/why-ar-software-sucks-for-small-businesses', 'final-blog-post'],
    ['/interview', 'final-interview'],
    ['/dashboard', 'final-dashboard'],
    ['/dashboard/invoices', 'final-invoices'],
    ['/dashboard/customers', 'final-customers'],
    ['/dashboard/dunning', 'final-dunning'],
    ['/dashboard/dunning/sequence', 'final-dunning-seq'],
    ['/dashboard/cash-flow', 'final-cash-flow'],
    ['/dashboard/billing', 'final-billing'],
    ['/dashboard/settings', 'final-settings'],
    ['/dashboard/integrations', 'final-integrations'],
    ['/dashboard/events', 'final-events'],
    ['/dashboard/payments', 'final-payments'],
  ];
  for (const [path, name] of pages) {
    try {
      await page.goto('http://localhost:3030' + path, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: '/tmp/' + name + '.png', fullPage: false });
      console.log('OK:', path);
    } catch (e) {
      console.log('FAIL:', path, e.message);
    }
  }
  await browser.close();
})();
