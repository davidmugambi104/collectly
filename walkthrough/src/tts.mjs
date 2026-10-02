// Narration via OpenRouter → Google Gemini 3.1 Flash TTS Preview.
// The endpoint returns raw PCM (s16le, 24 kHz, mono); we wrap it into WAV.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const MODEL = 'google/gemini-3.1-flash-tts-preview'
const RATE = 24000

export function apiKey() {
  const k = process.env.OPENROUTER_API_KEY
  if (!k) throw new Error('OPENROUTER_API_KEY missing (source the scratchpad .env)')
  return k
}

/// Synthesize one line → WAV path. Retries on transient failures.
export async function synthesize({ text, voice, outPath, instructions }) {
  const body = { model: MODEL, input: text, voice, response_format: 'pcm' }
  if (instructions) body.instructions = instructions
  let lastErr
  for (let attempt = 1; attempt <= 5; attempt++) {
    let res, pcm
    try {
      res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      })
      if (!res.ok) {
        lastErr = new Error(`tts ${res.status}: ${(await res.text()).slice(0, 300)}`)
        if (res.status === 400) throw lastErr
        await new Promise((r) => setTimeout(r, 1500 * attempt))
        continue
      }
      pcm = Buffer.from(await res.arrayBuffer())
    } catch (e) {
      if (res?.status === 400) throw e
      lastErr = e
      process.stdout.write(`(retry ${attempt}: ${e.cause?.code ?? e.name}) `)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
      continue
    }
    if (pcm.length < RATE) { lastErr = new Error('tts returned <0.5s of audio'); continue }
    const pcmPath = outPath.replace(/\.wav$/, '.pcm')
    fs.writeFileSync(pcmPath, pcm)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(RATE), '-ac', '1',
      '-i', pcmPath, outPath])
    fs.unlinkSync(pcmPath)
    return outPath
  }
  throw lastErr
}

export function durationOf(wavPath) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', wavPath]).toString().trim()
  return Number(out)
}

/// Generate every narration line of the storyboard into outDir/<id>.wav, skipping
/// lines whose text+voice hash is unchanged (cache in outDir/manifest.json).
export async function synthesizeAll(lines, { voice, outDir, instructions }) {
  fs.mkdirSync(outDir, { recursive: true })
  const manifestPath = path.join(outDir, 'manifest.json')
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {}
  const result = {}
  for (const line of lines) {
    const key = `${voice}|${instructions ?? ''}|${line.text}`
    const wav = path.join(outDir, `${line.id}.wav`)
    if (manifest[line.id]?.key === key && fs.existsSync(wav)) {
      result[line.id] = { wav, duration: manifest[line.id].duration }
      continue
    }
    process.stdout.write(`  tts ${line.id} (${voice}) … `)
    await synthesize({ text: line.text, voice, outPath: wav, instructions })
    const duration = durationOf(wav)
    manifest[line.id] = { key, duration }
    result[line.id] = { wav, duration }
    console.log(`${duration.toFixed(2)}s`)
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  }
  return result
}

// CLI: node src/tts.mjs "text" Voice out.wav
if (process.argv[1] && process.argv[1].endsWith('tts.mjs') && process.argv.length >= 5) {
  const [, , text, voice, outPath] = process.argv
  await synthesize({ text, voice, outPath })
  console.log(outPath, durationOf(outPath).toFixed(2) + 's')
}
