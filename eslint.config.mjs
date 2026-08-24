import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['drizzle/**', '.next/**', 'node_modules/**'],
  },
  {
    // Standalone CommonJS ops/dev tooling (screenshot capture, one-off
    // scrapers) -- not part of the Next.js app, never imported by src/,
    // run directly via `node <file>.js`. package.json has no "type":
    // "module", so require() here is correct CommonJS, not a lint issue.
    // The TypeScript-oriented no-require-imports rule from next/typescript
    // was applying to these by accident (they're .js, not .ts, but the
    // flat-config preset doesn't distinguish).
    files: [
      'scripts/*.js',
      'outreach/scripts/**/*.js',
      'screenshot*.js',
      'review-screenshot.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

export default eslintConfig;
