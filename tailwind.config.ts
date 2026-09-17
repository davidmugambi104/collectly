import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // ink + brand resolve through CSS variables so the SAME utility classes
      // (`bg-ink-50`, `text-brand-600`, ...) can carry different values in
      // different parts of the product. :root in globals.css keeps the original
      // marketing palette untouched; the `.app` scope wrapping the dashboard
      // redefines them as a warm neutral + violet accent. That is what lets the
      // authenticated app be restyled without rewriting the ~77 existing colour
      // usages across src/app/dashboard and src/components, and without moving
      // a single pixel on the marketing site.
      // Channel-triplet form is required for Tailwind's <alpha-value> support,
      // so `bg-ink-900/40` keeps working.
      colors: {
        ink: {
          50: 'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          950: 'rgb(var(--ink-950) / <alpha-value>)',
        },
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        // Full semantic ramps. These token names existed with only 500/600 and
        // were effectively unused (every call site reached for raw emerald-*/
        // amber-*/red-*), so widening them is safe. Values are muted relative to
        // Tailwind's defaults, which are too saturated for a table where a third
        // of the rows carry a status. Success is emerald rather than a pure
        // green so it stays separable from danger under deuteranopia.
        // Full 50-900 ramps. The 300/400/800/900 steps were missing, which is
        // why call sites kept reaching for raw emerald-400 / red-800 / amber-900
        // — the token simply didn't exist at that lightness. Filling the gaps is
        // what makes a mechanical raw-colour -> token migration safe.
        success: {
          50: '#ecfdf3', 100: '#d1fadf', 200: '#a6f4c5', 300: '#6ce9a6', 400: '#32d583',
          500: '#12b76a', 600: '#039855', 700: '#027a48', 800: '#05603a', 900: '#054f31',
        },
        warn: {
          50: '#fffaeb', 100: '#fef0c7', 200: '#fedf89', 300: '#fec84b', 400: '#fdb022',
          500: '#f79009', 600: '#dc6803', 700: '#b54708', 800: '#93370d', 900: '#7a2e0e',
        },
        danger: {
          50: '#fef3f2', 100: '#fee4e2', 200: '#fecdca', 300: '#fda29b', 400: '#f97066',
          500: '#ef4b3c', 600: '#d92d20', 700: '#b42318', 800: '#912018', 900: '#7a271a',
        },
        // Informational, non-severity states — a forecast, an FYI, a category
        // that is neither good nor bad. The semantic set had no such step, so
        // these call sites reached for raw blue-*/purple-*, which is why two
        // components sat outside the token system entirely. Desaturated to sit
        // beside the ink neutrals without competing with brand violet.
        info: {
          50: '#eff8ff', 100: '#d1e9ff', 200: '#b2ddff', 300: '#84caff', 400: '#53b1fd',
          500: '#2e90fa', 600: '#1570ef', 700: '#175cd3', 800: '#1849a9', 900: '#194185',
        },
        // Chart fills only, never badge colours. An ordered heat ramp so the
        // stacked aging bar reads as increasing severity rather than five
        // arbitrary categories. `current` is deliberately neutral: not a problem.
        aging: {
          current: '#a8a29c', '1-30': '#fdb022', '31-60': '#f79009',
          '61-90': '#ef6820', '90plus': '#d92d20',
        },
      },
      fontSize: {
        // Named token for badge / metadata text. Replaces 25 hardcoded
        // `text-[10px]` uses: 10px grey secondary text sat below the practical
        // legibility floor, which matters for an ICP of bookkeepers and
        // accountants reading dense financial tables all day.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      fontFamily: {
        // Point at the CSS variables next/font defines in layout.tsx. Naming
        // the family directly (as this did) only worked if the visitor happened
        // to have Inter installed locally — otherwise it fell straight through
        // to the fallbacks.
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Motion. The 0.5-0.6s ease-out entrances below are marketing timings —
      // on an interface you use all day they read as lag. App motion is fast
      // (140-220ms) and eased so it decelerates into place: the eye should
      // register that something arrived, never wait for it. `rise` is the
      // standard entrance; `settle` overshoots a hair, which is what makes a
      // panel feel physical rather than faded-in.
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'settle': 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        rise: 'rise 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        settle: 'settle 0.26s cubic-bezier(0.34, 1.4, 0.64, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        settle: { '0%': { opacity: '0', transform: 'translateY(6px) scale(0.995)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        // Loading placeholders that sweep read as "working"; ones that only
        // pulse read as broken.
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
export default config;
