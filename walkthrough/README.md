# templates/

Copy this directory to `<repo>/walkthrough/` and adapt:

| file | status | adapt |
|---|---|---|
| `run.mjs` | generic | the `startLocalStack()` around your app's build + mock; app-specific `initScripts`/`bindings` come from the storyboard |
| `storyboard.example.mjs` → `storyboard.mjs` | example | scenes, LAYOUT, THEME, CARDS, INTRO_LINES, VARIANTS, APP |
| `src/recorder.mjs` | generic | nothing (hooks: `cfg.initScripts`, `cfg.bindings`, `cfg.extraCss`, `cfg.hideSelectors`, `cfg.textReplace`) |
| `src/overlays.mjs` | generic | nothing (reads THEME/CARDS/LAYOUT from the storyboard) |
| `src/timeline.mjs`, `src/compose.py`, `src/mix.py`, `src/tts.mjs`, `src/music.mjs` | generic, verbatim from the reference pipeline | nothing |
| `src/wallet-inject.example.js` | example | wallet-standard provider + neutral approval popup; set `cfg.ns` to your chain's namespace, or port the pattern to your auth flow |
| `mock/server.example.mjs` → `mock/server.mjs` | example | endpoints, fixtures, and how a submitted transaction changes state |
| `mock/fixtures/enclaves.json` | example | replace with fixtures copied from your real API |

The two `.example` files and the fixture describe one made-up product end to
end — **Nimlith**, a confidential-compute vault on a fictional chain — so you
can read a complete storyboard instead of a skeleton: seven scenes, an injected
demo keyring with an on-camera approval, a mock gateway with an in-memory
ledger and a streamed job with a signed attestation receipt. Every address,
key and measurement in them is randomly generated. Replace the whole cast with
your own app; keep the shapes.

Deps: `npm i playwright` (plus whatever your app's mock needs); `python3` with
`opencv-python numpy pillow`; `ffmpeg` with libx264 (the 4K pass uses
VideoToolbox when ffmpeg has it); `OPENROUTER_API_KEY` in the env — ask the
user for a temporary key in chat, keep it in the session scratchpad only, and
remind them to revoke it afterwards.
