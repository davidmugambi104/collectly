// Storyboard — copy to storyboard.mjs and rewrite for YOUR app.
//
// Everything below describes a MADE-UP product so the file is a complete
// worked example rather than a skeleton: "Nimlith", a confidential-compute
// vault that runs jobs inside a TEE on a fictional chain (Auriga), with a
// demo keyring injected for the on-camera approval. Every address, key and
// measurement here is randomly generated and belongs to nothing.
//
// One entry per scene: narration (TTS), a caption (a short headline for the
// step rail — not the transcript), and the scripted actions via the recorder
// API (references/architecture.md). Narration is generated BEFORE recording,
// so each scene pads itself to the length of its line.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateKeyPairSync, sign as edSign, createHash, randomBytes } from 'node:crypto'
import { walletInitScript } from './src/wallet-inject.example.js'
const here = path.dirname(fileURLToPath(import.meta.url))

export const VOICE = process.env.VOICE ?? 'Puck' // rated best of 8 Gemini voices for tech explainers
export const VOICE_INSTRUCTIONS = 'Narrate like a friendly, confident YouTube tech explainer: warm, clear, natural pacing, slightly upbeat, never salesy.'

// ---- brand ---------------------------------------------------------------
export const THEME = {
  bg: '#08090c', bg2: '#101219', ink: '#e4e6ef', dim: '#8e93a6', dim2: '#62677a',
  accent: '#63d7c4', accentRgb: '99,215,196', line: '#e4e6ef2e',
  font: { family: "'Spline Sans Mono', ui-monospace, Menlo, monospace",
    googleCss: 'https://fonts.googleapis.com/css2?family=Spline+Sans+Mono:wght@400;500;600&display=swap' },
}

// ---- canvas layout (4K px): step rail left, browser window right ----------
export const LAYOUT = {
  canvas: { w: 3840, h: 2160 },
  rail: { x: 90, y: 200, w: 680, h: 1761, brand: 'nimlith', tag: 'walkthrough', footPrefix: 'try it →' },
  window: { x: 850, y: 200, w: 2900, h: 1761, bar: 130, radius: 26 },
  get content() { return { x: this.window.x, y: this.window.y + this.window.bar, w: this.window.w, h: this.window.h - this.window.bar } },
  logicalWidth: 1280,              // the app lays out at this CSS width inside the window
  url: 'nimlith.example',          // shown in the URL bar + rail foot + outro
  tabTitle: 'Nimlith · confidential vaults',
  favicon: 'N',
}

// ---- intro card: kinetic lines appear when the narrator reaches the anchor --
export const INTRO_LINES = [
  { text: 'your keys stay sealed', anchor: 'stay sealed' },
  { text: 'jobs run inside the enclave', anchor: 'inside the enclave' },
  { text: 'every answer is attested', anchor: 'attested' },
]

// ---- demo identity (generated, not real) -----------------------------------
const WALLET_ADDRESS = 'k8WouroPtbVWMtvhrwfzdLPD34H6WNoSGK4jbk1YPi3x'
const WALLET_SHORT = 'k8Wo…Pi3x'
const VAULT_ADDRESS = 'sdbpKyVrMB3HCmPuN2vfyJkVdFRVmHah1mvKVvyWxZdx'

// ---- text variants (VARIANT=<id>) -------------------------------------------
// The same take, re-cut for another chain: narration and captions come from the
// table, and the app's own copy is rewritten at record time by a text-node
// MutationObserver. Map identifiers to look-alikes of the target chain —
// including their truncated forms, or the short address on screen gives it away.
export const VARIANTS = {
  auriga: {
    id: 'auriga', name: 'Auriga', label: 'Auriga Mainnet', ticker: 'AUR', ns: 'auriga',
    fee: '0.00042 AUR', address: WALLET_ADDRESS, short: WALLET_SHORT, textReplace: [],
  },
  meridian: {
    id: 'meridian', name: 'Meridian', label: 'Meridian Network', ticker: 'MER', ns: 'meridian',
    fee: '0.0009 MER', address: '0x7f41c2e6b93a5d08ce1147ab2f6d905e3c8b47d2', short: '0x7f41…47d2',
    textReplace: [
      ['Auriga', 'Meridian'], ['AUR', 'MER'],
      [WALLET_ADDRESS, '0x7f41c2e6b93a5d08ce1147ab2f6d905e3c8b47d2'],
      [WALLET_SHORT, '0x7f41…47d2'],
    ],
  },
}
export const CHAIN = VARIANTS[process.env.VARIANT ?? 'auriga']
if (!CHAIN) throw new Error(`unknown VARIANT ${process.env.VARIANT}; use ${Object.keys(VARIANTS).join('|')}`)

export const CARDS = (chain) => ({
  intro: { brandHtml: 'NIM<b>LITH</b>', tagline: 'compute you can check', corner: LAYOUT.rail.brand, chip: 'walkthrough', foot: `on ${chain.name}` },
  outro: { kicker: 'Try it now', url: LAYOUT.url, corner: LAYOUT.rail.brand, foot: 'sealed · attested · yours', pills: [] },
})

// ---- how to reach the app ---------------------------------------------------
// Demo signing key: generated per run, lives in memory, signs nothing real.
const demoKey = generateKeyPairSync('ed25519')
const txHash = (txB64) => createHash('sha256').update(txB64).digest('hex')

export const APP = {
  url: 'http://127.0.0.1:5199/',
  local: true,                                  // run.mjs boots mock/server.mjs (+ the build) around the take
  waitFor: ['http://127.0.0.1:8799/health', 'http://127.0.0.1:5199/'],
  build: {                                      // static build served by the mock server — never a dev server
    cmd: path.join(here, '../app/node_modules/.bin/vite'), args: ['build', '--config', 'vite.mock.config.js', '--logLevel', 'warn'],
    cwd: path.join(here, '../app'), env: { VITE_GATEWAY_URL: 'http://127.0.0.1:8799' },
  },
  readySelector: '[data-test="vault-balance"]', // something that only appears once the app has its data
  // viewport units resolve against device px under CSS zoom — divide them out for full-height shells / modals
  zoomCss: (Z) => `.shell{height:calc(100vh / ${Z}) !important} .modal{max-height:calc(84vh / ${Z}) !important}`,
  hideSelectors: ['[data-dev]', '.faucet-link', '.testnet-banner'],

  // The injected keyring (src/wallet-inject.example.js) + the Node-side
  // bindings it calls. On this fictional chain a "transaction" is a JSON
  // envelope, so describing one is a JSON.parse — for a real chain, read the
  // transaction builder instead of guessing field offsets (references/gotchas.md).
  initScripts: (chain) => [walletInitScript({
    name: 'Demo Keyring', ns: chain.ns, chains: [`${chain.ns}:mainnet`], chainLabel: chain.label,
    address: chain.address, displayShort: chain.short, pubkeyBytes: [...randomBytes(32)],
    siteLabel: 'Nimlith', siteHost: LAYOUT.url, feeLabel: chain.fee,
    icon: 'data:image/svg+xml;base64,' + Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#63d7c4"/></svg>`).toString('base64'),
  })],
  bindings: (chain) => ({
    // rows shown in the approval popup — they must match what the tx really does
    __demoWalletDescribe: async (_source, txB64) => {
      const tx = JSON.parse(Buffer.from(txB64, 'base64').toString('utf8'))
      const rows = tx.kind === 'deposit'
        ? [{ label: 'Deposit to vault', value: `${tx.amount} ${chain.ticker}`, neg: true },
           { label: 'Vault', value: `${VAULT_ADDRESS.slice(0, 4)}…${VAULT_ADDRESS.slice(-4)}` }]
        : [{ label: tx.kind, value: tx.amount ? `${tx.amount} ${chain.ticker}` : '—' }]
      return { rows }
    },
    // submit to the mock ledger, get back a signature-shaped blob
    __demoWalletSignAndSend: async (_source, txB64) => {
      const r = await fetch('http://127.0.0.1:8799/chain/submit', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tx: txB64, from: chain.address }),
      })
      if (!r.ok) throw new Error(`submit failed: ${r.status}`)
      const { signature } = await r.json()
      return [...Buffer.from(signature, 'hex')]
    },
    __demoWalletSign: async (_source, txB64) => [...edSign(null, Buffer.from(txHash(txB64), 'hex'), demoKey.privateKey)],
    __demoWalletSignMessage: async (_source, msgB64) => [...edSign(null, Buffer.from(msgB64, 'base64'), demoKey.privateKey)],
  }),
}

// ---- scenes -----------------------------------------------------------------
export const storyboard = {
  lead: 0.35,  // narration starts this long after the scene starts
  tail: 0.9,   // the scene keeps running this long after narration ends
  scenes: [
    {
      id: 'intro', card: 'intro', lead: 0.6, tail: 0.6,
      narration: `Meet Nimlith. Your keys stay sealed, your jobs run inside the enclave, and every answer is attested. Here is the whole thing in two minutes, on ${CHAIN.name}.`,
      async run(api) { await api.moveTo([api.cfg.width * 0.5, api.cfg.height * 0.55], { duration: 1400 }) },
    },
    {
      id: 'tour',
      caption: { label: 'step 01', title: 'The dashboard', sub: 'Vaults, enclaves, receipts' },
      narration: 'This is the dashboard. Your vaults are on the left, the enclaves you can run on are in the middle, and every job you have ever run is receipted on the right.',
      async run(api) {
        await api.wait(1200)
        await api.hover('[data-test="nav-vaults"]', { duration: 900 })
        await api.wait(800)
        await api.hover('[data-test="enclave-list"]', { duration: 900 })
        await api.wait(1400)
      },
    },
    {
      id: 'connect',
      caption: { label: 'step 02', title: 'Connect a wallet', sub: 'One approval, nothing custodial' },
      narration: `Connecting takes one click. Nimlith never holds your key — it only ever sees the address you approve.`,
      async run(api) {
        await api.wait(900)
        await api.click('[data-test="connect-wallet"]')
        await api.wait(1100)                              // let the popup settle before the cursor moves
        await api.click('#demo-wallet #approve')          // the injected keyring, not a look-alike of a real wallet
        await api.waitFor('[data-test="account-chip"]')
        await api.wait(1200)
      },
    },
    {
      id: 'fund',
      caption: { label: 'step 03', title: 'Fund a vault', sub: 'Escrowed, spendable per job' },
      narration: `Funding a vault is a normal on-chain transfer. You approve it once, and the balance is metered down job by job — no subscription, no prepaid credits.`,
      async run(api) {
        await api.click('[data-test="deposit"]')
        await api.click('input[name="amount"]')
        await api.type('25', { speed: 'slow' })
        await api.click('button:has-text("Deposit")')
        await api.wait(900)
        await api.click('#demo-wallet #approve')
        await api.waitFor('[data-test="deposit-confirmed"]', { timeout: 20000 })
        await api.wait(1400)
      },
    },
    {
      id: 'job',
      caption: { label: 'step 04', title: 'Run it in the enclave', sub: 'The operator sees ciphertext' },
      narration: 'Now the part that matters. This prompt goes straight into a hardware enclave: the machine runs it, but the operator of that machine cannot read it.',
      async run(api) {
        await api.click('[data-test="job-input"]')
        await api.type('Summarise this quarter\'s payroll file for the board.', { speed: 'normal' })
        await api.press('Enter')
        await api.waitFor('[data-test="job-stream"]')
        await api.wait(6500)                              // let the answer stream in on camera
      },
    },
    {
      id: 'verify',
      caption: { label: 'step 05', title: 'Check the receipt', sub: 'Attestation, not a promise' },
      narration: 'And you do not have to take our word for it. Every answer comes with a signed attestation: the enclave measurement, the code that ran, and what you were billed.',
      async run(api) {
        await api.click('[data-test="receipt-badge"]')
        await api.waitFor('[data-test="attestation"]')
        await api.zoomTo('[data-test="attestation"]', { scale: 1.45 })   // frame the whole panel, not the badge
        await api.wait(3800)
        api.zoomOut()
        await api.wait(600)
      },
    },
    {
      id: 'outro', card: 'outro', lead: 0.8, tail: 1.2,
      narration: `That is Nimlith: sealed, attested, and yours. Try it at ${LAYOUT.url.replace(/\./g, ' dot ')}.`,
      async run(api) { await api.moveTo([api.cfg.width * 0.5, api.cfg.height * 0.6], { duration: 1200 }) },
    },
  ],
}

export const narrationLines = storyboard.scenes.map((s) => ({ id: s.id, text: s.narration }))
