// Offline narration with Piper (open source, runs on this machine, no key, no cost).
// Set PIPER_MODEL to a voice .onnx file. The default is the Alba voice (CSTR, University of
// Edinburgh), licensed CC BY 4.0, so it may be used on a commercial site if it is credited.
// Do NOT swap in a voice whose model card says NC (non-commercial), such as hfc_female or ryan.
// The manifest key is marked 'piper', so a later run with a real key replaces every line.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

export const PIPER_MODEL = process.env.PIPER_MODEL ?? path.join(os.homedir(), '.cache', 'piper-voices', 'en_GB-alba-medium.onnx')
export const piperAvailable = () => fs.existsSync(PIPER_MODEL)

export async function synthesizePiper(lines, { outDir }) {
  fs.mkdirSync(outDir, { recursive: true })
  const python = process.env.PYTHON ?? 'python3'
  const manifest = {}
  for (const line of lines) {
    const wav = path.join(outDir, `${line.id}.wav`)
    // Spoken form: a trailing pause after each line keeps scenes from running into each other.
    const text = line.text.replace(/\s+/g, ' ').trim()
    execFileSync(python, ['-m', 'piper', '-m', PIPER_MODEL, '-f', wav, '--length-scale', '1.05', '--sentence-silence', '0.25'], { input: text })
    const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString().trim())
    manifest[line.id] = { key: `piper|${line.text}`, duration }
    console.log(`  piper ${line.id} ${duration.toFixed(2)}s`)
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}
