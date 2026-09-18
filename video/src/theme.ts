/**
 * The site's design tokens, copied from src/app/globals.css.
 *
 * Copied rather than imported: Remotion is a separate project with its own
 * bundler and no Tailwind, so it cannot read the app's CSS variables. The
 * values are exact, and this file is the one place to update when a ramp is
 * retuned — a mismatch here is the difference between a demo video that looks
 * like the product and one that looks like a video about the product.
 */
export const ink = {
  50: '#faf9f8',
  100: '#f4f2f1',
  200: '#e8e6e3',
  300: '#d6d3cf',
  400: '#a8a29c',
  500: '#78716b',
  600: '#57534e',
  700: '#44403c',
  800: '#2c2a28',
  900: '#1c1a19',
  950: '#0f0e0d',
} as const;

export const brand = {
  50: '#f2f1fd',
  100: '#e6e3fb',
  200: '#cdc7f7',
  300: '#a89ef0',
  400: '#8a7ef1',
  500: '#6b5ce8',
  600: '#5744d6',
  700: '#4634b4',
} as const;

export const success = { 100: '#d1fadf', 500: '#12b76a', 600: '#039855', 700: '#027a48' } as const;
export const warn = { 100: '#fef0c7', 500: '#f79009', 700: '#b54708' } as const;
export const danger = { 100: '#fee4e2', 500: '#f04438', 600: '#d92d20', 700: '#b42318' } as const;

/** Matches the app: Inter for UI, a serif for display, mono for figures. */
export const font = {
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  display: '"Fraunces", Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export const money = (n: number) => `$${n.toLocaleString('en-US')}`;
