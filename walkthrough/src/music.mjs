// Background music via OpenRouter → Google Lyria 3 (streamed chat completion
// with audio modality; the audio arrives as base64 MP3 chunks in the deltas).
import fs from 'node:fs'
import { apiKey } from './tts.mjs'

const PROMPT = process.env.MUSIC_PROMPT ?? [
  'Instrumental background music for a polished software product walkthrough video.',
  'Calm, modern, minimal electronic: warm analog synth pads, a soft steady pulse,',
  'light glassy textures, gentle evolving layers, subtle low-key beat that never gets busy.',
  'Unobtrusive and confident, tech-explainer mood, no vocals, no lyrics, no big drops,',
  'consistent energy from start to end, 92 bpm, around three minutes long.',
].join(' ')

export async function generateMusic({ outPath, model = 'google/lyria-3-pro-preview', prompt = PROMPT }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, stream: true, modalities: ['text', 'audio'], audio: { format: 'mp3' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`music ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const chunks = []
  let text = ''
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      let j
      try { j = JSON.parse(payload) } catch { continue }
      if (j.error) throw new Error(`music: ${JSON.stringify(j.error).slice(0, 300)}`)
      for (const ch of j.choices ?? []) {
        if (ch.delta?.content) text += ch.delta.content
        if (ch.delta?.audio?.data) chunks.push(Buffer.from(ch.delta.audio.data, 'base64'))
      }
    }
  }
  if (!chunks.length) throw new Error(`music: no audio in response (text: ${text.slice(0, 200)})`)
  fs.writeFileSync(outPath, Buffer.concat(chunks))
  return { outPath, text }
}

if (process.argv[1]?.endsWith('music.mjs')) {
  const out = process.argv[2] ?? 'out/music.mp3'
  const model = process.argv[3] ?? 'google/lyria-3-pro-preview'
  const t0 = Date.now()
  const r = await generateMusic({ outPath: out, model })
  console.log(`music → ${r.outPath} in ${((Date.now() - t0) / 1000).toFixed(0)}s; note: ${r.text.slice(0, 120)}`)
}
