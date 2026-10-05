import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'api') continue; // route handlers: code, not visitor copy
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const copyFiles = [
  ...walk(join(root, 'app')),
  ...walk(join(root, 'components')),
  join(root, 'lib/posts.ts'),
];

test('no QBO or QB abbreviation in visitor-facing pages or components', () => {
  const bad = copyFiles.filter((f) => /\bQBO?\b/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(bad.map((f) => f.replace(root, '')), []);
});

test('marketing copy claims only the US and UK markets', () => {
  const patterns = [/US · UK · EU/, /US, UK, AU,? and CA/, /UK, US, AU,? and CA/, /US\/UK\/AU\/CA/, /Direct Debit for AU/];
  const bad: string[] = [];
  for (const f of copyFiles) {
    if (f.includes('/dashboard/admin/')) continue;
    const s = readFileSync(f, 'utf8');
    for (const re of patterns) if (re.test(s)) bad.push(`${f.replace(root, '')} ${re}`);
  }
  assert.deepEqual(bad, []);
});

test('footer names exactly the US and UK', () => {
  const footer = readFileSync(join(root, 'components/marketing/footer.tsx'), 'utf8');
  assert.ok(footer.includes('US and UK'));
});

test('security page makes no unprovable at-rest or certification claim', () => {
  const s = readFileSync(join(root, 'app/security/page.tsx'), 'utf8');
  assert.equal(/encrypted at rest/i.test(s), false);
  assert.equal(/SOC 2 Type II['"],\s*status:\s*'(enforced|available)'/.test(s), false);
});

test('dashboard integrations does not advertise integrations that do not exist', () => {
  const s = readFileSync(join(root, 'app/dashboard/integrations/page.tsx'), 'utf8');
  assert.equal(/NetSuite|MYOB|Sage/.test(s), false);
});
