// Renders every static layer with Chromium (brand font via Google Fonts, real CSS)
// to PNGs: the canvas "plate" (background + macOS-style browser window chrome),
// one step rail per scene (outside the window, current step highlighted), the
// intro card + its kinetic text lines, and the outro card. Everything brand-
// specific comes from the storyboard's THEME / CARDS / LAYOUT.
// Output: out/overlays/*.png + out/overlays/manifest.json {id: {file,w,h,kind,x,y}}.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

function base(theme) {
  const font = theme.font?.googleCss
    ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${theme.font.googleCss}" rel="stylesheet">` : ''
  return `${font}<style>
    :root { --bg:${theme.bg}; --bg2:${theme.bg2}; --ink:${theme.ink}; --dim:${theme.dim}; --dim2:${theme.dim2}; --accent:${theme.accent}; --line:${theme.line}; --accent-rgb:${theme.accentRgb}; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: transparent; }
    body { font-family: ${theme.font?.family ?? "ui-monospace, Menlo, monospace"}; color: var(--ink); -webkit-font-smoothing: antialiased; }
  </style>`
}

// ---- plate: canvas background + browser window chrome ----------------------
function plateHtml(L, theme) {
  const W = L.window
  return `${base(theme)}<style>
    body { width: ${L.canvas.w}px; height: ${L.canvas.h}px; position: relative; overflow: hidden;
      background: radial-gradient(1600px 1000px at 22% 18%, ${theme.plateGlow ?? '#191c1b'} 0%, ${theme.bg2} 45%, ${theme.bg} 100%); }
    .grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(var(--accent-rgb),.035) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--accent-rgb),.035) 1px, transparent 1px); background-size: 120px 120px;
      -webkit-mask-image: radial-gradient(1800px 1200px at 60% 50%, #000 20%, transparent 100%); }
    .win { position: absolute; left: ${W.x}px; top: ${W.y}px; width: ${W.w}px; height: ${W.h}px; border-radius: ${W.radius}px;
      background: var(--bg); box-shadow: 0 70px 180px rgba(0,0,0,.7), 0 10px 40px rgba(0,0,0,.5), 0 0 0 2px var(--line); overflow: hidden; }
    .bar { height: ${W.bar}px; background: ${theme.chromeBar ?? '#1a1b18'}; border-bottom: 2px solid ${theme.chromeLine ?? '#26271f'}; display: flex; flex-direction: column; }
    .tabs { height: 68px; display: flex; align-items: flex-end; padding: 0 30px; gap: 22px; }
    .lights { display: flex; gap: 16px; align-self: center; margin-right: 18px; }
    .lights i { width: 24px; height: 24px; border-radius: 50%; display: block; }
    .tab { display: flex; align-items: center; gap: 16px; height: 56px; padding: 0 28px; border-radius: 16px 16px 0 0; background: ${theme.chromeTab ?? '#0f100e'}; color: var(--ink); font-size: 26px; max-width: 900px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tab .fav { width: 26px; height: 26px; border-radius: 6px; background: var(--accent); flex: none; display: grid; place-items: center; color: var(--bg); font-weight: 700; font-size: 16px; }
    .plus { color: var(--dim); font-size: 34px; align-self: center; margin-left: 6px; }
    .urlrow { height: ${W.bar - 68}px; display: flex; align-items: center; gap: 22px; padding: 0 30px 0 34px; background: ${theme.chromeTab ?? '#0f100e'}; }
    .nav { color: var(--dim); font-size: 30px; display: flex; gap: 26px; }
    .url { flex: 1; height: 46px; border-radius: 12px; background: ${theme.chromeUrl ?? '#1d1e1a'}; border: 1px solid ${theme.chromeLine ?? '#2a2b25'}; display: flex; align-items: center; gap: 14px; padding: 0 22px; font-size: 26px; color: var(--ink); }
    .url .lock { width: 18px; height: 22px; border: 2px solid var(--dim); border-radius: 4px; position: relative; }
    .url .lock::before { content: ''; position: absolute; left: 2px; top: -12px; width: 10px; height: 12px; border: 2px solid var(--dim); border-bottom: 0; border-radius: 8px 8px 0 0; }
    .kebab { color: var(--dim); font-size: 34px; letter-spacing: 2px; }
  </style>
  <div class="grid"></div>
  <div class="win">
    <div class="bar">
      <div class="tabs">
        <div class="lights"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
        <div class="tab"><span class="fav">${esc(L.favicon ?? L.url[0].toUpperCase())}</span>${esc(L.tabTitle)}</div><div class="plus">+</div>
      </div>
      <div class="urlrow">
        <div class="nav"><span>‹</span><span>›</span><span>↻</span></div>
        <div class="url"><i class="lock"></i>https://<b style="font-weight:500;color:var(--ink)">${esc(L.url)}</b></div>
        <div class="kebab">⋮</div>
      </div>
    </div>
  </div>`
}

// ---- step rail (outside the window) ----------------------------------------
function railHtml(L, theme, steps, activeIdx, headline) {
  const rows = steps.map((s, i) => {
    const cls = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'todo'
    return `<li class="${cls}"><span class="num">${cls === 'done' ? '✓' : esc(s.num)}</span>
      <div><b>${esc(s.title)}</b>${cls === 'active' && s.sub ? `<small>${esc(s.sub)}</small>` : ''}</div></li>`
  }).join('')
  return `${base(theme)}<style>
    body { width: ${L.rail.w}px; height: ${L.rail.h}px; position: relative; }
    .rail { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 18px 10px; }
    .brand { font-size: 30px; color: var(--dim); letter-spacing: .1em; }
    .tag { display: inline-block; margin-top: 18px; font-size: 24px; color: var(--accent); border: 2px solid rgba(var(--accent-rgb),.45); border-radius: 999px; padding: 8px 22px; letter-spacing: .16em; text-transform: uppercase; align-self: flex-start; }
    .head { margin-top: 70px; padding-left: 26px; border-left: 6px solid var(--accent); }
    .head b { display: block; font-size: 44px; font-weight: 600; line-height: 1.15; }
    .head small { display: block; margin-top: 8px; font-size: 27px; color: var(--dim); line-height: 1.3; }
    ol { list-style: none; margin: 56px 0 0; padding: 0; display: flex; flex-direction: column; gap: 30px; }
    li { display: flex; gap: 22px; align-items: flex-start; padding-left: 26px; border-left: 6px solid transparent; }
    li .num { width: 52px; flex: none; font-size: 27px; color: var(--dim2); padding-top: 9px; letter-spacing: .05em; }
    li b { display: block; font-size: 38px; font-weight: 500; line-height: 1.2; color: var(--dim2); }
    li small { display: block; margin-top: 8px; font-size: 26px; color: var(--dim); line-height: 1.3; }
    li.active { border-left-color: var(--accent); }
    li.active .num { color: var(--accent); }
    li.active b { color: var(--ink); font-weight: 600; }
    li.done .num { color: var(--accent); }
    li.done b { color: var(--dim); }
    .foot { margin-top: auto; font-size: 28px; color: var(--dim2); }
    .foot b { color: var(--accent); font-weight: 500; }
  </style>
  <div class="rail" id="el">
    <div class="brand">${esc(L.rail.brand ?? L.url)}</div><div class="tag">${esc(L.rail.tag ?? 'walkthrough')}</div>
    ${headline ? `<div class="head"><b>${esc(headline.title)}</b><small>${esc(headline.sub)}</small></div>` : '<div style="height:70px"></div>'}
    <ol>${rows}</ol>
    <div class="foot">${esc(L.rail.footPrefix ?? 'try it →')} <b>${esc(L.url)}</b></div>
  </div>`
}

// ---- intro / outro cards + kinetic lines -----------------------------------
function introHtml(theme, card) {
  return `${base(theme)}<style>
    body { width: 3840px; height: 2160px; background: var(--bg); position: relative; overflow: hidden; }
    .glow { position: absolute; left: 50%; top: 38%; width: 2600px; height: 1300px; transform: translate(-50%,-50%);
      background: radial-gradient(closest-side, rgba(var(--accent-rgb),.16), rgba(var(--accent-rgb),.05) 45%, transparent 75%); }
    .grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(var(--accent-rgb),.045) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--accent-rgb),.045) 1px, transparent 1px); background-size: 120px 120px; -webkit-mask-image: radial-gradient(closest-side at 50% 40%, #000 30%, transparent 100%); }
    .wrap { position: absolute; left: 0; right: 0; top: 480px; display: flex; flex-direction: column; align-items: center; gap: 30px; }
    .brand { font-size: 280px; font-weight: 600; letter-spacing: .06em; color: var(--ink); text-shadow: 0 0 80px rgba(var(--accent-rgb),.35); line-height: 1; }
    .brand b { color: var(--accent); font-weight: 600; }
    .tag { font-size: 44px; color: var(--dim); letter-spacing: .04em; }
    .corner { position: absolute; left: 150px; top: 130px; font-size: 34px; color: var(--dim2); letter-spacing: .1em; }
    .chip { position: absolute; right: 150px; top: 130px; font-size: 30px; color: var(--accent); border: 2px solid rgba(var(--accent-rgb),.5); border-radius: 999px; padding: 14px 34px; letter-spacing: .14em; text-transform: uppercase; }
    .foot { position: absolute; bottom: 130px; left: 0; right: 0; text-align: center; font-size: 34px; color: var(--dim2); letter-spacing: .06em; }
  </style>
  <div class="grid"></div><div class="glow"></div>
  <div class="corner">${esc(card.corner ?? '')}</div><div class="chip">${esc(card.chip ?? 'walkthrough')}</div>
  <div class="wrap"><div class="brand">${card.brandHtml}</div><div class="tag">${esc(card.tagline ?? '')}</div></div>
  <div class="foot">${esc(card.foot ?? '')}</div>`
}

function lineHtml(theme, text) {
  return `${base(theme)}<style>
    .line { position: absolute; left: 0; top: 0; display: inline-flex; align-items: center; gap: 30px; padding: 6px 10px; white-space: nowrap; }
    .line i { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 30px rgba(var(--accent-rgb),.6); flex: none; }
    .line span { font-size: 66px; font-weight: 500; color: var(--ink); letter-spacing: -.01em; }
  </style><div class="line" id="el"><i></i><span>${esc(text)}</span></div>`
}

function outroHtml(theme, card) {
  const pills = (card.pills ?? []).map((p) => `<div class="pill"><span>${esc(p.label)}</span>&nbsp; ${esc(p.value)}</div>`).join('')
  return `${base(theme)}<style>
    body { width: 3840px; height: 2160px; background: var(--bg); position: relative; overflow: hidden; }
    .glow { position: absolute; left: 50%; top: 52%; width: 2800px; height: 1500px; transform: translate(-50%,-50%);
      background: radial-gradient(closest-side, rgba(var(--accent-rgb),.14), rgba(var(--accent-rgb),.04) 45%, transparent 75%); }
    .wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 40px; }
    .try { font-size: 54px; color: var(--dim); letter-spacing: .2em; text-transform: uppercase; }
    .url { font-size: 210px; font-weight: 600; color: var(--accent); letter-spacing: -.01em; text-shadow: 0 0 70px rgba(var(--accent-rgb),.35); line-height: 1.05; }
    .row { display: flex; gap: 70px; margin-top: 30px; }
    .pill { font-size: 36px; color: var(--ink); border: 2px solid var(--line); border-radius: 999px; padding: 22px 44px; background: var(--bg2); }
    .pill span { color: var(--dim); }
    .corner { position: absolute; left: 150px; top: 130px; font-size: 34px; color: var(--dim2); letter-spacing: .1em; }
    .foot { position: absolute; bottom: 130px; left: 0; right: 0; text-align: center; font-size: 34px; color: var(--dim2); letter-spacing: .06em; }
  </style>
  <div class="glow"></div><div class="corner">${esc(card.corner ?? '')}</div>
  <div class="wrap"><div class="try">${esc(card.kicker ?? 'Try it now')}</div><div class="url">${esc(card.url)}</div>${pills ? `<div class="row">${pills}</div>` : ''}</div>
  <div class="foot">${esc(card.foot ?? '')}</div>`
}

export function stepsOf(storyboard) {
  return storyboard.scenes
    .filter((s) => s.caption && /^step/i.test(s.caption.label))
    .map((s) => ({ id: s.id, num: s.caption.label.replace(/^step\s*/i, ''), title: s.caption.title, sub: s.caption.sub }))
}

export async function renderOverlays({ storyboard, outDir, layout, theme, cards, introLines }) {
  const dir = path.join(outDir, 'overlays')
  fs.mkdirSync(dir, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--font-render-hinting=none'] })
  const page = await browser.newPage({ viewport: { width: layout.canvas.w, height: layout.canvas.h }, deviceScaleFactor: 1 })
  const manifest = {}
  async function shot(id, html, { full = false, kind = 'caption', x = 0, y = 0, clipTo = null } = {}) {
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(120)
    const file = path.join(dir, `${id}.png`)
    if (full) {
      await page.screenshot({ path: file, omitBackground: false })
      manifest[id] = { file, w: layout.canvas.w, h: layout.canvas.h, kind, x: 0, y: 0 }
    } else {
      let clip
      if (clipTo) clip = { x: 0, y: 0, width: clipTo.w, height: clipTo.h }
      else { const b = await page.locator('#el').boundingBox(); clip = { x: 0, y: 0, width: Math.ceil(b.width) + 4, height: Math.ceil(b.height) + 4 } }
      await page.screenshot({ path: file, omitBackground: true, clip })
      manifest[id] = { file, w: clip.width, h: clip.height, kind, x, y }
    }
    console.log(`  overlay ${id} ${manifest[id].w}×${manifest[id].h}`)
  }

  await shot('plate', plateHtml(layout, theme), { full: true, kind: 'plate' })
  const steps = stepsOf(storyboard)
  for (const s of storyboard.scenes) {
    if (s.card) continue
    const activeIdx = steps.findIndex((st) => st.id === s.id)
    const headline = activeIdx < 0 && s.caption ? s.caption : null
    await shot(`rail-${s.id}`, railHtml(layout, theme, steps, activeIdx, headline), { kind: 'rail', x: layout.rail.x, y: layout.rail.y, clipTo: layout.rail })
  }
  if (cards?.intro) await shot('card-intro', introHtml(theme, cards.intro), { full: true, kind: 'card' })
  for (const [i, line] of (introLines ?? []).entries()) {
    await shot(`line-${i}`, lineHtml(theme, line.text), { kind: 'line', x: line.x ?? 1120, y: line.y ?? 1120 + i * 150 })
  }
  if (cards?.outro) await shot('card-outro', outroHtml(theme, cards.outro), { full: true, kind: 'card' })
  await browser.close()
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}
