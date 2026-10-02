// Playwright driver (generic). Opens the app in a viewport the size of the
// browser window's content area, applies a CSS zoom so the app lays out at a
// large logical size, captures a CDP screencast to JPEG frames with capture
// timestamps, and drives humanized cursor + typing while logging every input
// event with an epoch timestamp (events.jsonl). The cursor is NOT drawn in the
// page — compose.py paints it from the log at 60 fps.
//
// App-specific behaviour is injected through cfg:
//   cfg.initScripts   string[]  JS sources run before the page's scripts (e.g. a wallet provider)
//   cfg.bindings      {name: async (source, ...args) => any}  exposed as window[name]
//   cfg.extraCss      string    extra CSS appended to the zoom overrides
//   cfg.hideSelectors string[]  elements to hide on camera (dev links, banners)
//   cfg.textReplace   [[from, to]]  text-node substitutions re-applied on every DOM change
//   cfg.readySelector string    wait for this before the take starts (default 'body')
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = () => Date.now() / 1000
const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

export async function record({ storyboard, narration, cfg }) {
  const out = cfg.outDir
  const framesDir = path.join(out, 'frames')
  fs.rmSync(framesDir, { recursive: true, force: true })
  fs.mkdirSync(framesDir, { recursive: true })
  const eventsPath = path.join(out, 'events.jsonl')
  const framesPath = path.join(out, 'frames.jsonl')
  fs.writeFileSync(eventsPath, '')
  fs.writeFileSync(framesPath, '')
  const evStream = fs.createWriteStream(eventsPath, { flags: 'a' })
  const frStream = fs.createWriteStream(framesPath, { flags: 'a' })
  const log = (type, data = {}) => { evStream.write(JSON.stringify({ t: now(), type, ...data }) + '\n') }
  console.log(`recording ${cfg.url} at ${cfg.width}×${cfg.height}, zoom ${cfg.zoom}`)

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: cfg.headless ?? true, args: ['--hide-scrollbars', '--font-render-hinting=none'] })
  const context = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: 1,
    locale: cfg.locale ?? 'en-US', timezoneId: cfg.timezone ?? 'Europe/Berlin', colorScheme: cfg.colorScheme ?? 'dark',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  })

  for (const [name, fn] of Object.entries(cfg.bindings ?? {})) await context.exposeBinding(name, fn)
  for (const src of cfg.initScripts ?? []) await context.addInitScript(src)

  // zoom + viewport-unit overrides (vh/vw resolve against device px under CSS zoom)
  const Z = cfg.zoom
  const hide = (cfg.hideSelectors ?? []).map((s) => `${s}{display:none !important}`).join('\n')
  const css = `
    ::-webkit-scrollbar{width:0;height:0}
    ${cfg.extraCss ?? ''}
    ${hide}
  `
  await context.addInitScript(({ Z, css }) => {
    const apply = () => {
      const root = document.documentElement
      if (!root) return false
      root.style.zoom = String(Z)
      if (!document.getElementById('__wt_css')) {
        const s = document.createElement('style'); s.id = '__wt_css'; s.textContent = css
        ;(document.head ?? root).appendChild(s)
      }
      return true
    }
    if (!apply()) new MutationObserver((_, o) => { if (apply()) o.disconnect() }).observe(document, { childList: true })
    document.addEventListener('DOMContentLoaded', apply)
  }, { Z, css })

  // variant copy: swap words in the app's own text nodes, re-applied on every DOM change
  if (cfg.textReplace?.length) {
    await context.addInitScript((pairs) => {
      const apply = (root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        let n
        while ((n = walker.nextNode())) {
          let v = n.data
          for (const [from, to] of pairs) if (v.includes(from)) v = v.split(from).join(to)
          if (v !== n.data) n.data = v
        }
      }
      const start = () => {
        apply(document.body)
        new MutationObserver((muts) => {
          for (const m of muts) {
            if (m.type === 'characterData') apply(m.target.parentNode ?? document.body)
            for (const node of m.addedNodes) apply(node.nodeType === 3 ? node.parentNode : node)
          }
        }).observe(document.body, { childList: true, subtree: true, characterData: true })
      }
      if (document.body) start(); else document.addEventListener('DOMContentLoaded', start)
    }, cfg.textReplace)
  }

  const page = await context.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [page]', m.text().slice(0, 200)) })
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 200)))

  await page.goto(cfg.url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.locator(cfg.readySelector ?? 'body').first().waitFor({ timeout: 60_000 })
  await sleep(600)

  // ---- screencast -------------------------------------------------------
  const cdp = await context.newCDPSession(page)
  let nFrames = 0
  const pending = new Set()
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const i = nFrames++
    const file = `f${String(i).padStart(6, '0')}.jpg`
    const p = fs.promises.writeFile(path.join(framesDir, file), Buffer.from(data, 'base64'))
    pending.add(p); p.finally(() => pending.delete(p))
    frStream.write(JSON.stringify({ i, file, ts: metadata.timestamp, at: now() }) + '\n')
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })

  // ---- humanized input API ---------------------------------------------
  const cur = { x: cfg.width * 0.55, y: cfg.height * 0.62 }
  await page.mouse.move(cur.x, cur.y)

  async function pointOf(target, opts = {}) {
    if (Array.isArray(target)) return { x: target[0], y: target[1] }
    if (target && typeof target.x === 'number') return target
    const loc = typeof target === 'string' ? page.locator(target).first() : target
    await loc.waitFor({ state: 'visible', timeout: opts.timeout ?? 30_000 })
    await loc.scrollIntoViewIfNeeded().catch(() => {})
    const b = await loc.boundingBox()
    if (!b) throw new Error('target has no bounding box')
    const fx = opts.fx ?? rand(0.35, 0.65), fy = opts.fy ?? rand(0.4, 0.6)
    return { x: b.x + b.width * fx, y: b.y + b.height * fy, box: b }
  }

  async function glide(to, durMs) {
    const from = { ...cur }
    const dx = to.x - from.x, dy = to.y - from.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1) return
    const dur = durMs ?? clamp(280 + dist * 0.33, 340, 1150)
    const nx = -dy / dist, ny = dx / dist
    const bend = rand(-0.14, 0.14) * dist
    const cp = { x: (from.x + to.x) / 2 + nx * bend, y: (from.y + to.y) / 2 + ny * bend }
    const t0 = performance.now()
    for (;;) {
      const u = Math.min(1, (performance.now() - t0) / dur)
      const e = easeInOutCubic(u)
      const x = (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * cp.x + e * e * to.x
      const y = (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * cp.y + e * e * to.y
      cur.x = x; cur.y = y
      await page.mouse.move(x, y)
      log('move', { x: Math.round(x), y: Math.round(y) })
      if (u >= 1) break
      await sleep(7)
    }
  }

  const api = {
    page, log, cfg,
    wait: sleep,
    mark: (name, data) => log('mark', { name, ...data }),
    async moveTo(target, opts = {}) { const p = await pointOf(target, opts); await glide(p, opts.duration); await sleep(opts.settle ?? rand(90, 170)); return p },
    async hover(target, opts = {}) { return api.moveTo(target, opts) },
    async click(target, opts = {}) {
      const p = await api.moveTo(target, opts)
      log('down', { x: Math.round(p.x), y: Math.round(p.y) })
      await page.mouse.down()
      await sleep(rand(60, 95))
      await page.mouse.up()
      log('up', { x: Math.round(p.x), y: Math.round(p.y) })
      await sleep(opts.after ?? rand(120, 220))
      return p
    },
    async type(text, opts = {}) {
      const speed = opts.speed ?? 1
      for (const ch of text) {
        await page.keyboard.type(ch)
        log('key', { ch })
        let d = rand(42, 88)
        if (ch === ' ') d += rand(10, 40)
        if (',.?!:;'.includes(ch)) d += rand(110, 190)
        if (Math.random() < 0.05) d += rand(140, 260)
        await sleep(d / speed)
      }
    },
    async press(key) { await page.keyboard.press(key); log('key', { ch: key }) },
    async waitFor(target, opts = {}) {
      const loc = typeof target === 'string' ? page.locator(target).first() : target
      await loc.waitFor({ state: opts.state ?? 'visible', timeout: opts.timeout ?? 30_000 })
      return loc
    },
    async rectOf(target) {
      const loc = typeof target === 'string' ? page.locator(target).first() : target
      const b = await loc.boundingBox()
      return b ? [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] : null
    },
    /// Screen-Studio style zoom-in on a target (composited later). scale ~1.3–1.8.
    async zoomTo(target, opts = {}) {
      const rect = Array.isArray(target) ? target : await api.rectOf(target)
      if (!rect) return
      log('zoom', { rect, scale: opts.scale ?? 1.5, duration: opts.duration ?? 0.7 })
    },
    zoomOut(opts = {}) { log('zoom', { scale: 1, duration: opts.duration ?? 0.7 }) },
  }

  // ---- run the storyboard ------------------------------------------------
  await cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: cfg.jpegQuality ?? 92, maxWidth: cfg.width, maxHeight: cfg.height, everyNthFrame: 1,
  })
  await sleep(400)
  log('start', { url: cfg.url, width: cfg.width, height: cfg.height, zoom: Z })
  const sceneTimes = []
  for (const [idx, scene] of storyboard.scenes.entries()) {
    const start = now()
    console.log(`▶ scene ${idx} ${scene.id}`)
    log('scene', { id: scene.id, idx })
    try {
      await scene.run(api)
    } catch (e) {
      console.log(`  scene ${scene.id} failed: ${e.message}`)
      log('error', { id: scene.id, message: String(e.message) })
      if (!scene.optional) throw e
    }
    const nar = narration[scene.id]?.duration ?? 0
    const minDur = (scene.lead ?? storyboard.lead ?? 0.3) + nar + (scene.tail ?? storyboard.tail ?? 0.9)
    const elapsed = now() - start
    if (elapsed < minDur) await sleep((minDur - elapsed) * 1000)
    log('scene_end', { id: scene.id })
    sceneTimes.push({ id: scene.id, start, end: now() })
    console.log(`  ${scene.id}: ${(now() - start).toFixed(1)}s (narration ${nar.toFixed(1)}s)`)
  }
  await sleep(500)
  log('end')
  await cdp.send('Page.stopScreencast')
  await sleep(300)
  await Promise.all([...pending])
  await Promise.all([evStream, frStream].map((s) => new Promise((r) => s.end(r))))
  await browser.close()
  console.log(`captured ${nFrames} frames, ${sceneTimes.length} scenes, ${(sceneTimes.at(-1).end - sceneTimes[0].start).toFixed(1)}s`)
  return { frames: nFrames, scenes: sceneTimes }
}
