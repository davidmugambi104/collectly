#!/usr/bin/env node
// Walkthrough video pipeline. Stages: tts → music → record → overlays → timeline → compose → mix.
//   node run.mjs all            # everything
//   node run.mjs record         # one stage (needs the earlier ones' outputs)
//   SCENES=intro,tour node run.mjs record     # dry-run a subset
//   VARIANT=<id> node run.mjs all             # text variant → out-<id>/
//   PREVIEW=1 node run.mjs compose            # 720p quick render
// Env: OPENROUTER_API_KEY (tts/music), VOICE, VARIANT, HEADED=1, OUT_DIR, ZOOM
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import {
  storyboard, narrationLines, VOICE, VOICE_INSTRUCTIONS, LAYOUT, THEME, CARDS, INTRO_LINES, CHAIN, APP,
} from './storyboard.mjs'
import { synthesizeAll } from './src/tts.mjs'
import { synthesizeSilent } from './src/tts-silent.mjs'
import { synthesizePiper, piperAvailable } from './src/tts-piper.mjs'
import { generateMusic } from './src/music.mjs'
import { record } from './src/recorder.mjs'
import { renderOverlays } from './src/overlays.mjs'
import { buildTimeline } from './src/timeline.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
// each variant renders into its own folder (out/, out-<variant>/)
const OUT = process.env.OUT_DIR ?? path.join(here, CHAIN.id === 'default' ? 'out' : `out-${CHAIN.id}`)
fs.mkdirSync(OUT, { recursive: true })

// the recording viewport is the browser window's content area; CSS zoom gives
// the app a LAYOUT.logicalWidth-wide layout inside it
const content = LAYOUT.content
const cfg = {
  url: APP.url, local: APP.local,
  outDir: OUT, width: content.w, height: content.h, zoom: content.w / LAYOUT.logicalWidth, jpegQuality: 92,
  headless: !process.env.HEADED,
  readySelector: APP.readySelector,
  extraCss: APP.zoomCss(content.w / LAYOUT.logicalWidth),
  hideSelectors: APP.hideSelectors,
  textReplace: CHAIN.textReplace,
  // ---- app-specific hooks (see templates/src/wallet-inject.example.js) ----
  initScripts: APP.initScripts?.(CHAIN) ?? [],
  bindings: APP.bindings?.(CHAIN) ?? {},
}
if (process.env.ZOOM) cfg.zoom = Number(process.env.ZOOM)

async function waitForHttp(url, ms = 30_000) {
  const t0 = Date.now()
  for (;;) {
    try { const r = await fetch(url); if (r.ok) return } catch {}
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${url}`)
    await new Promise((r) => setTimeout(r, 300))
  }
}

/// Build the app once with the mock aliases (STATIC files — never a dev server
/// with live-reload during a take), then boot the mock server that also serves
/// that build. Returns a stop().
async function startLocalStack() {
  if (APP.build) {
    console.log('building the mock app…')
    const b = spawnSync(APP.build.cmd, APP.build.args, { cwd: APP.build.cwd, env: { ...process.env, ...APP.build.env }, stdio: 'inherit' })
    if (b.status !== 0) throw new Error('app build failed')
  }
  const procs = [spawn('node', ['mock/server.mjs'], { cwd: here, stdio: 'inherit' })]
  const stop = () => procs.forEach((p) => { try { p.kill() } catch {} })
  process.on('exit', stop)
  try {
    for (const u of APP.waitFor ?? [APP.url]) await waitForHttp(u)
  } catch (e) { stop(); throw e }
  return stop
}

const stages = {
  async tts() {
    if (!process.env.OPENROUTER_API_KEY && piperAvailable()) {
      console.log('tts: no OPENROUTER_API_KEY, using the offline Piper voice (CC BY 4.0, credit it on the page).')
      await synthesizePiper(narrationLines, { outDir: path.join(OUT, 'voice') })
      return
    }
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('tts: no OPENROUTER_API_KEY, writing SILENT placeholders timed by word count. Re-run `node run.mjs tts` with a key for the real voice.')
      await synthesizeSilent(narrationLines, { outDir: path.join(OUT, 'voice') })
      return
    }
    console.log(`tts: ${narrationLines.length} lines, voice ${VOICE}`)
    await synthesizeAll(narrationLines, { voice: VOICE, outDir: path.join(OUT, 'voice'), instructions: VOICE_INSTRUCTIONS })
  },
  async music() {
    const p = path.join(OUT, 'music.mp3')
    if (fs.existsSync(p) && !process.env.FORCE) { console.log('music: exists, skipping'); return }
    console.log('music: generating (Lyria 3 pro)…')
    await generateMusic({ outPath: p })
  },
  async record() {
    const narration = loadNarration()
    const only = process.env.SCENES?.split(',').map((s) => s.trim()).filter(Boolean)
    const sb = only ? { ...storyboard, scenes: storyboard.scenes.filter((s) => only.includes(s.id)) } : storyboard
    const stop = cfg.local ? await startLocalStack() : () => {}
    try { await record({ storyboard: sb, narration, cfg }) } finally { stop() }
  },
  async overlays() {
    await renderOverlays({ storyboard, outDir: OUT, layout: LAYOUT, theme: THEME, cards: CARDS(CHAIN), introLines: INTRO_LINES })
  },
  async timeline() {
    const narration = loadNarration()
    const overlays = JSON.parse(fs.readFileSync(path.join(OUT, 'overlays', 'manifest.json'), 'utf8'))
    buildTimeline({ outDir: OUT, storyboard, narration, overlays, layout: LAYOUT, introLines: INTRO_LINES })
  },
  async compose() {
    const args = ['src/compose.py', OUT, ...(process.env.PREVIEW ? ['--preview'] : [])]
    const r = spawnSync(process.env.PYTHON || 'python3', args, { cwd: here, stdio: 'inherit' })
    if (r.status !== 0) throw new Error('compose failed')
  },
  async mix() {
    const r = spawnSync(process.env.PYTHON || 'python3', ['src/mix.py', OUT], { cwd: here, stdio: 'inherit' })
    if (r.status !== 0) throw new Error('mix failed')
  },
}

function loadNarration() {
  const m = JSON.parse(fs.readFileSync(path.join(OUT, 'voice', 'manifest.json'), 'utf8'))
  const out = {}
  for (const id of Object.keys(m)) out[id] = { wav: path.join(OUT, 'voice', `${id}.wav`), duration: m[id].duration }
  return out
}

const order = ['tts', 'music', 'record', 'overlays', 'timeline', 'compose', 'mix']
const want = process.argv.slice(2)
// only run when invoked as a script (importing this module must never start a pipeline)
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
const todo = !isMain ? [] : want.includes('all') || want.length === 0 ? order : want
for (const s of todo) {
  if (!stages[s]) { console.error(`unknown stage ${s}; stages: ${order.join(' ')}`); process.exit(2) }
  const t0 = Date.now()
  console.log(`\n== ${s} ==`)
  await stages[s]()
  console.log(`== ${s} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
