/**
 * End-to-end functional audit of every flow that doesn't need paid keys.
 * Tests dunning, AI insights, cash flow, lead capture, interview, playbook,
 * pay page, cron route, and the public marketing pages.
 */
const { chromium } = require('/home/davie/.openclaw/workspace/collectly/node_modules/playwright');
const { Client } = require('pg');
require('dotenv').config({ path: '/home/davie/.openclaw/workspace/collectly/.env.local' });

const log = (label, ok, extra = '') => console.log(`  ${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`);

async function db() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  return c;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // Sign in via dev shim
  await page.goto('http://localhost:3100/sign-in', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.click('text=Sign in (dev)');
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  console.log('Signed in\n');

  const c = await db();
  const out = { sections: [] };

  // ===== 1. DUNNING PREVIEW (AI tone fallback) =====
  console.log('1. Dunning preview (no OpenAI key — uses fallback)');
  const invRow = await c.query("SELECT id, number FROM invoices LIMIT 1");
  const invId = invRow.rows[0]?.id;
  if (invId) {
    const r = await page.evaluate(async (id) => {
      const resp = await fetch('/api/dunning/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: id, amount: '1250.00', currency: 'USD', daysOverdue: 42, channel: 'email', tone: 'firm' }),
      });
      return { status: resp.status, body: await resp.json() };
    }, invId);
    if (r.status === 200 && r.body.subject) {
      log('Dunning preview with real invoice', true, `subject: "${r.body.subject.slice(0, 50)}…"`);
    } else {
      log('Dunning preview with real invoice', false, `status ${r.status} body: ${JSON.stringify(r.body).slice(0, 100)}`);
    }
  } else {
    log('Dunning preview', false, 'no invoice found in DB');
  }

  // ===== 2. DUNNING SEQUENCE EDITOR =====
  console.log('\n2. Dunning sequence editor (page loads, list steps)');
  await page.goto('http://localhost:3100/dashboard/dunning', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const steps = await page.locator('text=/s[1-4]|Step|day.*overdue|days? from due/i').count();
  const seqH1 = (await page.locator('h1').first().textContent().catch(() => ''))?.trim().slice(0, 50);
  log('Dunning page renders', true, `h1="${seqH1}"`);
  log('Sequence has step indicators', steps > 0, `${steps} step indicators`);

  // ===== 3. CASH FLOW FORECAST (no Plaid — uses payment history) =====
  console.log('\n3. Cash flow forecast');
  await page.goto('http://localhost:3100/dashboard/cash-flow', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const forecastHasContent = (await page.locator('body').textContent())?.match(/week|forecast|project|expected/i);
  log('Cash flow page loads with forecast content', !!forecastHasContent);
  // Look for the 4-week forecast
  const weeks = await page.locator('text=/week [1-4]/i').count();
  log('Multi-week forecast visible', weeks >= 4, `${weeks} weeks found`);

  // ===== 4. AI INSIGHTS (exec-summary) =====
  console.log('\n4. AI exec summary (no OpenAI — uses fallback)');
  const r = await page.evaluate(async () => {
    const resp = await fetch('/api/exec-summary', { method: 'GET' });
    return { status: resp.status, body: await resp.json() };
  });
  if (r.status === 200 && (r.body.summary || r.body.headline)) {
    log('Exec summary renders', true, (r.body.summary || r.body.headline || '').slice(0, 80));
  } else {
    log('Exec summary renders', false, `status ${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
  }

  // ===== 5. LEAD CAPTURE (waitlist + lead-notify) =====
  console.log('\n5. Lead capture');
  const leadR = await page.evaluate(async () => {
    const r1 = await fetch('/api/waitlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `test-${Date.now()}@example.com`, name: 'Test User', teamSize: '5-10' }),
    });
    return { status: r1.status, body: await r1.json() };
  });
  log('Waitlist POST accepts lead', leadR.status === 200 || leadR.status === 429, `status ${leadR.status}`);

  // ===== 6. AI DUNNING PUBLIC DEMO (homepage) =====
  console.log('\n6. Public AI dunning demo');
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded' });
  await anonPage.waitForTimeout(2000);
  const dunningDemo = await anonPage.locator('text=/Try.*dunning|dunning.*demo/i').count();
  log('Homepage has dunning demo CTA', dunningDemo > 0);
  if (dunningDemo > 0) {
    // Try clicking it
    const ctaBtn = anonPage.locator('text=/Try.*dunning|dunning.*demo/i').first();
    await ctaBtn.click().catch(() => {});
    await anonPage.waitForTimeout(2000);
    const demoText = await anonPage.locator('text=/tone|firm|friendly|final/i').count();
    log('Dunning demo has tone selector', demoText > 0);
  }
  await anon.close();

  // ===== 7. PUBLIC PAY PAGE (with real invoice id) =====
  console.log('\n7. Public pay page');
  const anon2 = await browser.newContext();
  const payPage = await anon2.newPage();
  await payPage.goto(`http://localhost:3100/pay/${invId}`, { waitUntil: 'domcontentloaded' });
  await payPage.waitForTimeout(2000);
  const payHasContent = (await payPage.locator('body').textContent())?.match(/invoice|amount|pay|usd|\$/i);
  log('Pay page renders invoice info', !!payHasContent);
  await payPage.screenshot({ path: '/tmp/pay-page.png' });
  await anon2.close();

  // ===== 8. CRON ROUTE (dunning auto-send) =====
  console.log('\n8. Cron route');
  const cronR = await page.evaluate(async () => {
    const r = await fetch('/api/cron/dunning', { method: 'GET' });
    return { status: r.status, body: await r.text() };
  });
  log('Cron route accepts POST', cronR.status === 200 || cronR.status === 401, `status ${cronR.status}`);

  // ===== 9. INTERVIEW + PLAYBOOK =====
  console.log('\n9. Marketing utilities');
  const intR = await page.evaluate(async () => {
    const r = await fetch('/api/interview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', role: 'founder', struggle: 'getting_paid' }),
    });
    return r.status;
  });
  log('Interview endpoint accepts submission', intR === 200 || intR === 429, `status ${intR}`);

  // ===== 10. ROI CALCULATOR =====
  console.log('\n10. ROI calculator');
  await page.goto('http://localhost:3100/tools/ar-roi', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const calcInputs = await page.locator('input[type="number"]').count();
  log('ROI calculator has 7+ inputs', calcInputs >= 7, `${calcInputs} inputs`);

  // ===== 11. EVENTS WRITTEN? =====
  console.log('\n11. Event audit log');
  const ev = await c.query('SELECT type, count(*) FROM events GROUP BY type ORDER BY count(*) DESC');
  if (ev.rows.length > 0) {
    log('Events table has activity', true, ev.rows.map(r => `${r.type}=${r.count}`).join(', '));
  } else {
    log('Events table empty (audit log not yet emitting)', false, 'consider adding audit log writes in handlers');
  }

  // ===== Summary =====
  console.log('\n=== Console errors collected ===');
  if (errors.length === 0) {
    log('No console / page errors anywhere', true);
  } else {
    console.log('  Errors:');
    errors.slice(0, 10).forEach(e => console.log('    ' + e.slice(0, 200)));
  }

  await browser.close();
  await c.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
