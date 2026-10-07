import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HELP_PAGES } from './help-pages.ts';

// Imports nothing but node:fs, so the plain node test runner can resolve it
// without the '@/' alias (same reason seo-guards.test.ts reads source text).
const HELP_DIR = fileURLToPath(new URL('..', import.meta.url));
const SITEMAP = readFileSync(fileURLToPath(new URL('../../sitemap.ts', import.meta.url)), 'utf8');

function helpPageFolders(): string[] {
  return readdirSync(HELP_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_lib')
    .map((d) => d.name)
    .sort();
}

test('every folder under src/app/help has a matching HELP_PAGES entry, and no entry is orphaned', () => {
  const folders = helpPageFolders();
  const slugs = HELP_PAGES.map((p) => p.slug).sort();
  assert.deepEqual(slugs, folders, 'HELP_PAGES and the folders on disk must list exactly the same slugs');
});

test('every HELP_PAGES slug has a page.tsx file', () => {
  for (const p of HELP_PAGES) {
    assert.doesNotThrow(() => statSync(`${HELP_DIR}${p.slug}/page.tsx`), `missing page.tsx for /help/${p.slug}`);
  }
});

test('the sitemap lists every help page, under its own path', () => {
  for (const p of HELP_PAGES) {
    assert.match(SITEMAP, new RegExp(`/help/\\$\\{p\\.slug\\}`), 'sitemap must map HELP_PAGES to /help/<slug>');
  }
  assert.match(SITEMAP, /\{ path: '\/help', /, 'the help index itself must be in the sitemap');
});

test('no help page title or summary uses an em dash or en dash', () => {
  for (const p of HELP_PAGES) {
    assert.doesNotMatch(p.title, /[–—]/, `title for ${p.slug}`);
    assert.doesNotMatch(p.summary, /[–—]/, `summary for ${p.slug}`);
  }
});

test('no help page source text uses an em dash or en dash', () => {
  const folders = [...helpPageFolders(), '.']; // '.' covers the /help index page itself
  for (const folder of folders) {
    const path = folder === '.' ? `${HELP_DIR}page.tsx` : `${HELP_DIR}${folder}/page.tsx`;
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /[–—]/, `em or en dash found in ${path}`);
  }
});

test('every help page sets its own canonical path in pageMetadata, matching its folder', () => {
  for (const folder of helpPageFolders()) {
    const source = readFileSync(`${HELP_DIR}${folder}/page.tsx`, 'utf8');
    assert.match(source, new RegExp(`path: '/help/${folder}'`), `pageMetadata path mismatch for ${folder}`);
  }
});
