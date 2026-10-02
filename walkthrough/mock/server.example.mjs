// Mock backend for the walkthrough recording — copy to mock/server.mjs and
// rewrite the endpoints for YOUR app's API.
//
// This one backs the made-up product in storyboard.example.mjs: "Nimlith",
// confidential-compute vaults on a fictional chain. It stands in for three
// things a demo of that kind needs, and each is a pattern worth keeping:
//   1. a catalog endpoint served from a fixture, so lists look production-real
//      (copy the fixture from your real API — invented rows look invented),
//   2. an in-memory ledger that applies the app's own transactions, so the
//      balance on screen actually moves when the wallet popup is approved,
//   3. a streamed job endpoint with realistic first-token latency and token
//      pacing — instant text reads fake on camera.
// It also serves the app's STATIC build on the app port: a dev server with
// live-reload will reset your app mid-scene (references/gotchas.md).
//
// Every key, address and measurement here is randomly generated at boot or
// baked into the fixture. Nothing is real and nothing talks to a network.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.MOCK_PORT ?? 8799)
const SELF = `http://127.0.0.1:${PORT}`
const fixture = (n) => JSON.parse(fs.readFileSync(path.join(here, 'fixtures', `${n}.json`), 'utf8'))

const catalog = fixture('enclaves')
const active = catalog.enclaves.find((e) => e.status === 'active')
const VAULT = 'sdbpKyVrMB3HCmPuN2vfyJkVdFRVmHah1mvKVvyWxZdx'
const TICKER = process.env.MOCK_TICKER ?? 'AUR'

// ---- canned answers: match on intent, never on an exact prompt ---------------
const ANSWERS = [
  [/payroll|summar(y|ise|ize)|quarter/i,
    'Here is the short version. Headcount cost is up eleven percent on the quarter, and almost all of that is the two senior hires in March rather than any broad raise. Contractor spend is down by a third now that the migration is finished. Nothing in this file left the enclave: the numbers were decrypted in sealed memory, summarised, and the plaintext was discarded when the job ended.'],
  [/attest|verify|proof|receipt/i,
    'The receipt is a signed quote from the enclave itself. It names the measurement of the exact image that ran, the public key that signed the answer, and the tokens you were billed for — so you can check the run against a build you trust instead of trusting the operator.'],
  [/hi|hello|hey/i, 'Hi. I am running inside an attested enclave, so whatever you paste here stays sealed. What should I look at?'],
]
const DEFAULT_ANSWER = 'Confidential compute keeps the data, the code, and the result inside a hardware enclave; the operator of the machine only ever sees ciphertext, and the signed receipt at the end of the job lets you verify exactly what ran.'

// ---- in-memory ledger --------------------------------------------------------
const balances = new Map()   // address -> whole units held in the vault
const billed = new Map()     // address -> micro-units spent so far
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
}
function json(res, body, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}
function readBody(req) {
  return new Promise((resolve) => { let b = ''; req.on('data', (c) => { b += c }); req.on('end', () => resolve(b)) })
}
const lastUserText = (messages) => {
  const m = [...messages].reverse().find((x) => x.role === 'user')
  const c = m?.content
  if (typeof c === 'string') return c
  return (c ?? []).filter((p) => p.type === 'text').map((p) => p.text).join(' ')
}

/// Apply a transaction the injected keyring approved. On this fictional chain a
/// transaction is a JSON envelope; for a real one, parse it with the same builder
/// the app uses — guessing at byte offsets is how you end up with a 1.1e18
/// balance on camera (references/gotchas.md).
async function submitTx(req, res) {
  const { tx, from } = JSON.parse(await readBody(req) || '{}')
  const env = JSON.parse(Buffer.from(tx, 'base64').toString('utf8'))
  const owner = env.from ?? from
  if (env.kind === 'deposit') balances.set(owner, (balances.get(owner) ?? 0) + Number(env.amount))
  else if (env.kind === 'withdraw') balances.set(owner, Math.max(0, (balances.get(owner) ?? 0) - Number(env.amount)))
  else return json(res, { error: `unknown tx kind ${env.kind}` }, 400)
  await sleep(Number(process.env.MOCK_CONFIRM_MS ?? 1100))   // a confirmation you can see happen
  const signature = randomBytes(64).toString('hex')
  console.log(`  tx ${env.kind} ${env.amount} ${TICKER} → balance ${balances.get(owner)}`)
  json(res, { signature, slot: 41_820_000 + Math.floor(Math.random() * 999), vault: VAULT })
}

/// Stream a job the way the real one streams: wait, then emit tokens at a human
/// reading pace, then a signed receipt.
async function runJob(req, res) {
  const body = JSON.parse(await readBody(req) || '{}')
  const text = lastUserText(body.messages ?? [{ role: 'user', content: body.prompt ?? '' }])
  const answer = (ANSWERS.find(([re]) => re.test(text)) ?? [null, DEFAULT_ANSWER])[1]
  const enclave = catalog.enclaves.find((e) => e.id === body.enclave_id) ?? active
  const inTok = Math.max(12, Math.round((text.length || 40) / 4.2))
  const outTok = Math.round(answer.split(/\s+/).length * 1.3)
  const cost = Math.round((inTok * enclave.price.unitsPerMtokIn + outTok * enclave.price.unitsPerMtokOut) / 1e6)
  const owner = body.owner ?? 'anon'
  const cum = (billed.get(owner) ?? 0) + cost
  billed.set(owner, cum)

  res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-cache' })
  await sleep(Number(process.env.MOCK_TTFT_MS ?? 700))       // first-token latency
  const words = answer.split(' ')
  for (let i = 0; i < words.length; i++) {
    res.write(JSON.stringify({ delta: (i ? ' ' : '') + words[i] }) + '\n')
    await sleep(26 + Math.random() * 22)
  }
  res.write(JSON.stringify({
    done: true, in_tokens: inTok, out_tokens: outTok, cost,
    receipt: {
      vault: VAULT, cum_billed: String(cum), response_hash: '0x' + sha256hex(answer),
      enclave: enclave.id, tee: enclave.tee, mrenclave: enclave.mrenclave,
      signer: enclave.signer, signature: '0x' + randomBytes(64).toString('hex'),
    },
  }) + '\n')
  res.end()
  console.log(`  job on ${enclave.label} → ${outTok} tok, cost ${cost} µ${TICKER} (cum ${cum})`)
}

const server = http.createServer(async (req, res) => {
  cors(res)
  const url = new URL(req.url, SELF)
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
  try {
    if (url.pathname === '/health') return json(res, { ok: true, epoch: catalog.epoch })
    // catalog: endpoints rewritten to this mock so the app talks to nobody else
    if (url.pathname === '/enclaves') return json(res, { epoch: catalog.epoch, enclaves: catalog.enclaves.map((e) => ({ ...e, endpoint: SELF })) })
    if (url.pathname === '/enclaves/recommend') return json(res, { ...active, endpoint: SELF })
    if (url.pathname === '/attestation') {
      return json(res, {
        enclave: active.id, tee: active.tee, mrenclave: active.mrenclave, signer: active.signer,
        tcb_status: 'UpToDate', verified_at: new Date().toISOString(),
        quote: '0x' + randomBytes(96).toString('hex'),
      })
    }
    if (url.pathname.startsWith('/vaults/')) {
      const owner = decodeURIComponent(url.pathname.slice('/vaults/'.length))
      return json(res, { vault: VAULT, owner, balance: String(balances.get(owner) ?? 0), ticker: TICKER, billed: String(billed.get(owner) ?? 0) })
    }
    if (url.pathname === '/chain/submit' && req.method === 'POST') return await submitTx(req, res)
    if (url.pathname === '/jobs/run' && req.method === 'POST') return await runJob(req, res)
    json(res, { error: 'not found' }, 404)
  } catch (e) {
    console.error('mock error', e)
    json(res, { error: String(e.message) }, 500)
  }
})
server.listen(PORT, '127.0.0.1', () => console.log(`mock gateway on ${SELF}`))

// ---- static app (the mock build) on the app port -----------------------------
const APP_PORT = Number(process.env.MOCK_APP_PORT ?? 5199)
const DIST = path.join(here, 'dist')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json' }
if (fs.existsSync(DIST)) {
  http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${APP_PORT}`)
    let file = path.join(DIST, decodeURIComponent(url.pathname))
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    fs.createReadStream(file).pipe(res)
  }).listen(APP_PORT, '127.0.0.1', () => console.log(`mock app (static build) on http://127.0.0.1:${APP_PORT}`))
} else {
  console.log(`no dist/ yet — build the app into ${DIST} (run.mjs does this before a take)`)
}
