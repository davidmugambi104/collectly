// Silent stand-in for the narration, so the rest of the pipeline can run without a voice key.
// Each line becomes a silent WAV as long as a calm speaker would take (about 2.6 words a second).
// The manifest key is marked 'silent', so `node run.mjs tts` with a real key replaces every one of them.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const WORDS_PER_SECOND = 2.6

export function estimateSeconds(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.round((words / WORDS_PER_SECOND + 0.4) * 100) / 100
}

export async function synthesizeSilent(lines, { outDir }) {
  fs.mkdirSync(outDir, { recursive: true })
  const manifest = {}
  for (const line of lines) {
    const wav = path.join(outDir, `${line.id}.wav`)
    const duration = estimateSeconds(line.text)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(duration), wav])
    manifest[line.id] = { key: `silent|${line.text}`, duration }
    console.log(`  silent ${line.id} ${duration.toFixed(2)}s`)
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}
