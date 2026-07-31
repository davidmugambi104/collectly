const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  const base = process.argv[2] || 'https://collectly-hi9bx0g68-david-mugambis-projects.vercel.app';
  const pages = [
    ['/', 'home'],
    ['/pricing', 'pricing'],
    ['/features', 'features'],
    ['/integrations', 'integrations'],
    ['/security', 'security'],
    ['/about', 'about'],
    ['/faq', 'faq'],
    ['/tour', 'tour'],
    ['/playbook', 'playbook'],
    ['/interview', 'interview'],
    ['/vs-chaser', 'vs-chaser'],
    ['/blog', 'blog'],
    ['/privacy', 'privacy'],
    ['/terms', 'terms'],
    ['/tools/ar-roi', 'ar-roi'],
    ['/tools/ar-cost-calculator', 'ar-cost'],
  ];
  for (const [path, name] of pages) {
    try {
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(1500);
      const title = await page.title().catch(() => '');
      console.log('OK', name, path, title);
      await page.screenshot({ path: `/tmp/collectly-review-${name}.png`, fullPage: true });
    } catch (e) {
      console.log('ERR', name, path, e.message);
    }
  }
  await browser.close();
})();
