# Collectly demo video (Remotion)

A 73-second walkthrough rendered to MP4: A/R aging → AI dunning →
promise-to-pay → cash forecast, then a closing card.

Separate from the Next app on purpose. Remotion pulls roughly 200MB including
its own headless Chrome, and none of that belongs in the site's build or its
`node_modules`. This directory has its own `package.json` and is ignored by
the root `.gitignore` for `node_modules/` and `out/`.

## Commands

```bash
cd video
npm install
npm run studio    # preview and scrub at http://localhost:3000
npm run render    # writes out/collectly-demo.mp4
npm run still     # one frame, for checking a scene quickly
```

`npm run still -- --frame=600` renders a specific frame, which is much faster
than a full render when you are adjusting one scene.

## Structure

| File | What it is |
|---|---|
| `src/Root.tsx` | Registers the composition: 1920×1080, 30fps |
| `src/Composition.tsx` | Scene order, durations, crossfades, captions, closing card |
| `src/theme.ts` | The site's tokens, copied from `globals.css` |
| `src/components/Chrome.tsx` | Sidebar + title bar every scene renders inside |
| `src/scenes/*.tsx` | One file per scene |

## Timing

Scene lengths live in `SCENES` in `src/Composition.tsx`. Dunning is the
longest at 22s because it is the only scene with prose the viewer has to read;
the others are figures and shapes, which land faster. `TOTAL_FRAMES` is
derived, so changing a duration is a one-number edit.

## Data

Every figure is demo data, and each scene carries a visible "Demo data" badge —
`bootstrap-db.ts` in the main app requires that on anything modelled on the dev
seed that a prospect might see, and a video is front-of-prospect.

The forecast scene deliberately uses the same numbers as
`src/components/marketing/cash-forecast-chart.tsx`, so the video and the site
cannot quote different figures for the same claim. If you change one, change
both.

## Known gap

Fonts fall back to system serif/sans/mono in the render — Fraunces, Inter and
JetBrains Mono are loaded by the Next app via `next/font` and are not available
to Remotion's browser. It reads fine, but to match exactly, add
`@remotion/google-fonts` and load them in `Composition.tsx`.
