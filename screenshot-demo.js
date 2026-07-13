const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3030/', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  // Scroll to the dunning demo section
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h2')].find(h => h.textContent?.includes('exactly what we'));
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/v3-home-demo.png', fullPage: false });
  console.log('OK: demo section');
  // Click the generate button
  await page.click('button:has-text("Generate message")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/v3-home-demo-output.png', fullPage: false });
  console.log('OK: with output');
  await browser.close();
})();
