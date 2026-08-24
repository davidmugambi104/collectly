#!/usr/bin/env node
/**
 * Mint a Clerk session for the given user_id and inject it into a
 * Playwright browser context, then drive the QBO connect flow.
 */
import { createClerkClient } from '@clerk/backend';
import { chromium } from 'playwright';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const TARGET_USER_ID = 'user_3H5T8gnZqMYlLwYLI6lls3kr4mY';
const TARGET_ORG_ID = process.env.TEST_ORG_ID || 'org_3H678THvTlPs2uFn8eXv9RIkhU6';

if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY not set in .env.local');
  process.exit(2);
}

console.log('Creating Clerk client...');
const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

console.log(`Creating session for user ${TARGET_USER_ID}...`);
const session = await clerk.sessions.createSession({ userId: TARGET_USER_ID });
console.log(`  session.id: ${session.id}`);
console.log(`  session.status: ${session.status}`);

console.log('Fetching session token (JWT)...');
const tokenResource = await clerk.sessions.getToken(session.id);
const token = tokenResource.jwt;
console.log(`  jwt length: ${token.length}`);

console.log('\nLaunching Playwright with session cookie...');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([{
  name: '__session',
  value: token,
  domain: '.getcollectly.app',
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
}]);
console.log('  cookie set on .getcollectly.app');

const page = await ctx.newPage();

const redirects = [];
page.on('framenavigated', (frame) => {
  if (frame === page.mainFrame()) redirects.push(frame.url());
});
page.on('response', async (resp) => {
  const url = resp.url();
  if (url.includes('quickbooks') || url.includes('intuit') || resp.status() >= 400) {
    console.log(`  [${resp.status()}] ${url}`);
  }
});

console.log(`\nNavigating to /api/quickbooks/connect?orgId=${TARGET_ORG_ID}...`);
const result = await page.goto(
  `https://getcollectly.app/api/quickbooks/connect?orgId=${TARGET_ORG_ID}`,
  { waitUntil: 'networkidle', timeout: 30000 },
);

console.log(`\nFinal URL: ${page.url()}`);
console.log(`Final status: ${result?.status()}`);
console.log(`Final title: ${await page.title()}`);

try {
  const body = await page.evaluate(() => document.body?.innerText?.slice(0, 1500));
  if (body) console.log(`\nVisible body (first 1500 chars):\n${body}`);
} catch  {
  // Ignore — some redirects can't be introspected
}

console.log('\nRedirect chain:');
for (const url of redirects) console.log(`  → ${url}`);

await page.screenshot({ path: '/tmp/connect-result.png', fullPage: true });
console.log('\nScreenshot: /tmp/connect-result.png');

await browser.close();