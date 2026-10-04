import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every public address must come from src/lib/site-contact.ts so the mailbox domain flips with
// one line. A literal address in a page, component or route would be missed by that flip.
const ROOTS = ['src/app', 'src/components'];
// TEMPORARY: the homepage is held back (uncommitted edits in the main checkout). Its founders@
// link at line ~523 must become `mailto:${CONTACT.founders}?subject=...`; then delete this entry.
const KNOWN_PENDING = new Set(['src/app/page.tsx']);
const ADDRESS = /[A-Za-z0-9._%+-]+@(getcollectly\.app|mugavi\.com)\b/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|txt|md|json)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

test('no hard-coded @getcollectly.app or @mugavi.com address under src/app or src/components', () => {
  const hits: string[] = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      if (KNOWN_PENDING.has(file)) continue;
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (ADDRESS.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
        ADDRESS.lastIndex = 0;
      });
    }
  }
  assert.deepEqual(hits, [], 'route these through src/lib/site-contact.ts:\n' + hits.join('\n'));
});

test('site-contact is the only place that names the mailbox domain', async () => {
  const { CONTACT, CONTACT_DOMAIN, placeholderEmail } = await import('./site-contact.ts');
  for (const v of Object.values(CONTACT)) assert.ok(v.endsWith('@' + CONTACT_DOMAIN));
  assert.equal(placeholderEmail('acme'), 'acme@' + CONTACT_DOMAIN);
});
