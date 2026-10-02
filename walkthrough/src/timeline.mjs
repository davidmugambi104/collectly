// Merges the recording (frames.jsonl + events.jsonl), narration durations and the
// overlay manifest into one fully-resolved timeline.json (all times in seconds
// relative to the first captured frame; all coordinates in CANVAS px) for
// compose.py and mix.py. The recording viewport maps 1:1 onto the browser
// window's content area of the canvas (layout.content), so page coords just
// get that offset.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))

/// Map narration text character index → seconds, anchored on the pauses the TTS
/// actually made (ffmpeg silencedetect) matched in order to the punctuation in
/// the text; linear in between. Falls back to plain proportional timing.
function charTimeMap(text, wav, duration) {
  const r = spawnSync('ffmpeg', ['-i', wav, '-af', 'silencedetect=noise=-38dB:d=0.16', '-f', 'null', '-'], { encoding: 'utf8' })
  const log = r.stderr ?? ''
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]))
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]))
  const sil = starts.map((s, i) => [s, ends[i] ?? duration]).filter(([s, e]) => e - s >= 0.16)
  const lead = sil.length && sil[0][0] < 0.05 ? sil.shift()[1] : 0
  const tail = sil.length && sil.at(-1)[1] >= duration - 0.05 ? sil.pop()[0] : duration
  const pauses = sil.map(([s, e]) => (s + e) / 2)
  const punct = [...text.matchAll(/[,:;.!?](?=\s)/g)].map((m) => m.index + 1)
  // Match each punctuation mark to the nearest unused pause (monotonic), starting
  // from a proportional guess — the TTS may breathe where there is no comma.
  let anchors = [[0, lead], [text.length, tail]]
  if (pauses.length) {
    const prop = (idx) => lead + (tail - lead) * (idx / text.length)
    const picked = []
    let from = 0
    for (const idx of punct) {
      const guess = prop(idx)
      let best = -1, bestD = Infinity
      for (let j = from; j < pauses.length; j++) {
        const d = Math.abs(pauses[j] - guess)
        if (d < bestD) { bestD = d; best = j }
      }
      if (best >= 0 && bestD < 1.6) { picked.push([idx, pauses[best]]); from = best + 1 }
    }
    anchors = [[0, lead], ...picked, [text.length, tail]]
    console.log(`  phrase timing: matched ${picked.length}/${punct.length} punctuation marks to ${pauses.length} pauses`)
  }
  return (idx) => {
    for (let i = 1; i < anchors.length; i++) {
      const [i0, t0] = anchors[i - 1], [i1, t1] = anchors[i]
      if (idx <= i1) return t0 + (t1 - t0) * ((idx - i0) / Math.max(1, i1 - i0))
    }
    return tail
  }
}

export function buildTimeline({ outDir, storyboard, narration, overlays, layout, introLines = [], fps = 60 }) {
  const frames = readJsonl(path.join(outDir, 'frames.jsonl'))
  const events = readJsonl(path.join(outDir, 'events.jsonl'))
  if (!frames.length) throw new Error('no frames captured')

  const lags = frames.map((f) => f.at - f.ts).sort((a, b) => a - b)
  const lag = lags[Math.floor(lags.length / 2)]
  const useArrival = Math.abs(lag) > 1.5
  if (useArrival) console.log(`  ! frame timestamps are not epoch-based (median lag ${lag.toFixed(2)}s) — using arrival clock`)
  else console.log(`  frame clock ok (median capture→arrival lag ${(lag * 1000).toFixed(0)} ms)`)
  const fts = (f) => (useArrival ? f.at - lag : f.ts)

  const t0 = fts(frames[0])
  const start = events.find((e) => e.type === 'start')
  const end = events.find((e) => e.type === 'end')
  const duration = (end?.t ?? fts(frames.at(-1))) - t0
  const rel = (t) => Math.max(0, t - t0)
  const C = layout.content
  const ox = C.x, oy = C.y

  const scenes = []
  for (const e of events) {
    if (e.type === 'scene') scenes.push({ id: e.id, start: rel(e.t), end: null })
    if (e.type === 'scene_end') { const s = scenes.find((x) => x.id === e.id); if (s) s.end = rel(e.t) }
  }
  for (const s of scenes) if (s.end == null) s.end = duration

  const cursor = events.filter((e) => e.type === 'move' || e.type === 'down' || e.type === 'up').map((e) => [rel(e.t), e.x + ox, e.y + oy])
  const clicks = events.filter((e) => e.type === 'down').map((e) => [rel(e.t), e.x + ox, e.y + oy])
  const zooms = events.filter((e) => e.type === 'zoom').map((e) => ({
    t: rel(e.t), scale: e.scale, duration: e.duration ?? 0.7,
    cx: e.rect ? e.rect[0] + e.rect[2] / 2 + ox : layout.canvas.w / 2,
    cy: e.rect ? e.rect[1] + e.rect[3] / 2 + oy : layout.canvas.h / 2,
  }))

  const lead = storyboard.lead ?? 0.3
  const narrationTrack = []
  const overlayTrack = []
  const introScene = scenes.find((s) => storyboard.scenes.find((x) => x.id === s.id)?.card === 'intro')
  for (const sc of storyboard.scenes) {
    const s = scenes.find((x) => x.id === sc.id)
    if (!s) continue
    const n = narration[sc.id]
    const nStart = s.start + (sc.lead ?? lead)
    if (n) narrationTrack.push({ id: sc.id, wav: n.wav, start: nStart, duration: n.duration })

    const rail = overlays[`rail-${sc.id}`]
    if (rail) {
      const afterIntro = introScene && Math.abs(s.start - introScene.end) < 0.2
      overlayTrack.push({
        id: `rail-${sc.id}`, png: rail.file, x: rail.x, y: rail.y, kind: 'rail', anim: 'fade',
        start: s.start, end: s.end + 0.05, fadeIn: afterIntro ? 0 : 0.4, fadeOut: 0.35,
      })
    }
    if (sc.card && overlays[`card-${sc.card}`]) {
      const o = overlays[`card-${sc.card}`]
      const isIntro = sc.card === 'intro'
      overlayTrack.push({
        id: `card-${sc.card}`, png: o.file, x: 0, y: 0, kind: 'card', drift: !isIntro,
        start: isIntro ? 0 : s.start, end: isIntro ? s.end : duration + 1,
        anim: isIntro ? 'hold-out' : 'in-hold', fadeIn: isIntro ? 0 : 0.9, fadeOut: isIntro ? 0.8 : 0,
      })
      if (isIntro && n) {
        const at = charTimeMap(sc.narration, n.wav, n.duration)
        introLines.forEach((line, i) => {
          const o2 = overlays[`line-${i}`]
          if (!o2) return
          const idx = sc.narration.indexOf(line.anchor)
          const tLine = idx >= 0 ? at(idx) : (i + 1) * (n.duration / (introLines.length + 1))
          overlayTrack.push({
            id: `line-${i}`, png: o2.file, x: o2.x, y: o2.y, kind: 'line', anim: 'rise',
            start: nStart + tLine - 0.08, end: s.end, fadeIn: 0.5, fadeOut: 0.8,
          })
        })
      }
    }
  }

  const timeline = {
    fps, width: layout.canvas.w, height: layout.canvas.h, duration, t0,
    layout: { plate: overlays.plate?.file, content: { x: C.x, y: C.y, w: C.w, h: C.h }, radius: layout.window.radius },
    frames: frames.map((f) => [+(fts(f) - t0).toFixed(4), f.file]),
    cursor, clicks, zooms, scenes, narration: narrationTrack, overlays: overlayTrack,
  }
  fs.writeFileSync(path.join(outDir, 'timeline.json'), JSON.stringify(timeline))
  const lines = overlayTrack.filter((o) => o.kind === 'line').map((o) => `${o.id}@${o.start.toFixed(1)}`).join(' ')
  console.log(`  timeline: ${duration.toFixed(1)}s, ${frames.length} frames (${(frames.length / duration).toFixed(1)} fps captured), ${scenes.length} scenes, ${overlayTrack.length} overlays, ${zooms.length} zoom cues; intro lines ${lines}`)
  return timeline
}
