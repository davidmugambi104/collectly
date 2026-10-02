// Browser-side demo keyring for the walkthrough recording — a wallet-standard
// provider injected via Playwright addInitScript with a config object. Signing
// happens in Node through exposed bindings (__demoWalletDescribe /
// __demoWalletSignAndSend / …, see storyboard.example.mjs); this file owns
// discovery (wallet-standard events), account state, and the neutral "approve"
// popup the scripted cursor clicks.
//
// Deliberately NOT a look-alike of any real wallet product: it is called
// "Demo Keyring", it is visibly generic, and it signs with a throwaway key.
// Keep it that way — a demo video that imitates someone's wallet UI is a
// phishing frame with a voiceover.
//
// cfg.ns is the chain namespace used for the feature names: 'solana' for
// Solana (`solana:signAndSendTransaction`), your own chain's namespace
// otherwise. The example storyboard uses a fictional chain.
export function walletInitScript(cfg) {
  return `(${install.toString()})(${JSON.stringify(cfg)})`
}

function install(cfg) {
  const ns = cfg.ns ?? 'solana'
  const account = {
    address: cfg.address,
    publicKey: new Uint8Array(cfg.pubkeyBytes),
    chains: cfg.chains,
    features: [`${ns}:signAndSendTransaction`, `${ns}:signTransaction`, `${ns}:signMessage`],
    label: 'Account 1',
  }
  let connected = false
  const listeners = {}
  const emit = (ev, data) => (listeners[ev] ?? []).forEach((cb) => { try { cb(data) } catch {} })
  const toB64 = (u8) => btoa(String.fromCharCode(...u8))

  // ---------------------------------------------------------------- popup --
  let host = null
  function ensureHost() {
    if (host && host.isConnected) return host
    host = document.createElement('div')
    host.id = 'demo-wallet'
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;'
    const sh = host.attachShadow({ mode: 'open' })
    sh.innerHTML = `<style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .card { pointer-events: auto; position: absolute; top: 14px; right: 14px; width: 372px;
        background: #16171b; color: #f1f1f4; border: 1px solid #2c2e36; border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4);
        font: 14px/1.45 -apple-system, "SF Pro Text", "Segoe UI", Inter, system-ui, sans-serif;
        opacity: 0; transform: translateY(-10px) scale(.98); transition: opacity .18s ease, transform .22s cubic-bezier(.2,.8,.2,1); }
      .card.in { opacity: 1; transform: none; }
      .card.out { opacity: 0; transform: translateY(-6px) scale(.98); }
      .hd { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #24262d; }
      .logo { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg,#7c6cff,#4fd1c5); display: grid; place-items: center; }
      .logo svg { width: 16px; height: 16px; }
      .hd b { font-size: 14px; font-weight: 600; }
      .hd small { margin-left: auto; color: #8b8e99; font-size: 12px; }
      .body { padding: 16px; }
      .title { font-size: 17px; font-weight: 650; margin: 0 0 4px; letter-spacing: -.01em; }
      .site { color: #8b8e99; font-size: 12.5px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
      .site i { width: 7px; height: 7px; border-radius: 50%; background: #4fd1c5; display: inline-block; }
      .rows { background: #1d1f25; border: 1px solid #2a2c34; border-radius: 10px; overflow: hidden; }
      .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; border-top: 1px solid #262830; font-size: 13px; }
      .row:first-child { border-top: 0; }
      .row span:first-child { color: #b6b8c2; }
      .row span:last-child { font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
      .row.neg span:last-child { color: #ff8a8a; }
      .note { color: #8b8e99; font-size: 12px; margin-top: 12px; }
      .acct { display: flex; align-items: center; gap: 10px; padding: 10px 12px; }
      .av { width: 30px; height: 30px; border-radius: 50%; background: conic-gradient(from 90deg,#7c6cff,#4fd1c5,#7c6cff); }
      .acct div { display: flex; flex-direction: column; }
      .acct b { font-size: 13px; }
      .acct small { color: #8b8e99; font-size: 12px; font-family: ui-monospace, Menlo, monospace; }
      .btns { display: flex; gap: 10px; padding: 0 16px 16px; }
      button { flex: 1; height: 42px; border-radius: 10px; border: 1px solid #2f323b; background: #22242b; color: #e8e8ee;
        font: 600 14px -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; cursor: pointer; transition: filter .12s, transform .08s; }
      button:hover { filter: brightness(1.15); }
      button:active { transform: scale(.98); }
      button.primary { background: #6f5cff; border-color: #6f5cff; color: #fff; }
      .status { display: none; align-items: center; gap: 10px; padding: 12px 16px 16px; color: #c9cbd3; font-size: 13.5px; }
      .status .spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #3a3d47; border-top-color: #b5abff; animation: r .8s linear infinite; }
      .status .ok { width: 18px; height: 18px; border-radius: 50%; background: #2fbf8f; display: grid; place-items: center; color: #08130f; font-size: 12px; font-weight: 800; }
      @keyframes r { to { transform: rotate(360deg); } }
    </style><div class="card" id="card"></div>`
    document.body.appendChild(host)
    return host
  }
  const short = (a) => a.slice(0, 4) + '…' + a.slice(-4)
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

  /// Show the popup; resolves with a `done(ok)` closer once the user approves.
  function popup(kind, summary) {
    return new Promise((resolve, reject) => {
      const sh = ensureHost().shadowRoot
      const card = sh.getElementById('card')
      const logo = '<div class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="#0b0c10" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12h5"/><path d="M3 10h18"/></svg></div>'
      if (kind === 'connect') {
        card.innerHTML = `<div class="hd">${logo}<b>Wallet</b><small>${esc(cfg.chainLabel)}</small></div>
          <div class="body"><p class="title">Connect to ${esc(cfg.siteLabel)}</p>
          <div class="site"><i></i>${esc(cfg.siteHost || location.host)}</div>
          <div class="rows"><div class="acct"><div class="av"></div><div><b>Account 1</b><small>${esc(cfg.displayShort || short(cfg.address))}</small></div></div></div>
          <p class="note">This site will see your address and ask for your approval before every transaction.</p></div>
          <div class="btns"><button id="reject">Cancel</button><button id="approve" class="primary">Connect</button></div>`
      } else {
        const rows = (summary?.rows ?? []).map((r) => `<div class="row${r.neg ? ' neg' : ''}"><span>${esc(r.label)}</span><span>${esc(r.value)}</span></div>`).join('')
        card.innerHTML = `<div class="hd">${logo}<b>Wallet</b><small>${esc(cfg.chainLabel)}</small></div>
          <div class="body"><p class="title">Approve transaction</p>
          <div class="site"><i></i>${esc(cfg.siteHost || location.host)}</div>
          <div class="rows">${rows}<div class="row"><span>Network fee</span><span>${esc(cfg.feeLabel || 'included')}</span></div></div></div>
          <div class="btns"><button id="reject">Reject</button><button id="approve" class="primary">Approve</button></div>
          <div class="status" id="status"><div class="spin"></div><span>Confirming on ${esc(cfg.chainLabel)}…</span></div>`
      }
      card.classList.remove('out')
      requestAnimationFrame(() => card.classList.add('in'))
      const close = () => { card.classList.add('out'); setTimeout(() => { card.classList.remove('in', 'out'); card.innerHTML = '' }, 220) }
      sh.getElementById('reject').onclick = () => { close(); reject(new Error('User rejected the request')) }
      sh.getElementById('approve').onclick = () => {
        if (kind === 'connect') { close(); resolve(() => {}); return }
        sh.querySelector('.btns').style.display = 'none'
        const st = sh.getElementById('status'); st.style.display = 'flex'
        resolve((ok) => {
          st.innerHTML = ok ? '<div class="ok">✓</div><span>Confirmed</span>' : '<span style="color:#ff8a8a">Failed</span>'
          setTimeout(close, ok ? 900 : 1800)
        })
      }
    })
  }

  // --------------------------------------------------------------- wallet --
  const wallet = {
    version: '1.0.0',
    name: cfg.name,
    icon: cfg.icon,
    chains: cfg.chains,
    get accounts() { return connected ? [account] : [] },
    features: {
      'standard:connect': {
        version: '1.0.0',
        async connect() {
          if (!connected) {
            await popup('connect')
            connected = true
            emit('change', { accounts: [account] })
          }
          return { accounts: [account] }
        },
      },
      'standard:disconnect': { version: '1.0.0', async disconnect() { connected = false; emit('change', { accounts: [] }) } },
      'standard:events': {
        version: '1.0.0',
        on(ev, cb) { (listeners[ev] ??= []).push(cb); return () => { listeners[ev] = listeners[ev].filter((f) => f !== cb) } },
      },
      [`${ns}:signAndSendTransaction`]: {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        async signAndSendTransaction(...inputs) {
          const out = []
          for (const inp of inputs) {
            const txB64 = toB64(inp.transaction)
            const summary = await window.__demoWalletDescribe(txB64)
            const done = await popup('approve', summary)
            try {
              // mock build: the in-memory chain applies the instructions itself
              const sig = window.__demoMockChain
                ? await window.__demoMockChain.applyTx(Array.from(inp.transaction))
                : await window.__demoWalletSignAndSend(txB64, inp.chain ?? cfg.chains[0])
              done(true)
              out.push({ signature: new Uint8Array(sig) })
            } catch (e) { done(false); throw e }
          }
          return out
        },
      },
      [`${ns}:signTransaction`]: {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        async signTransaction(...inputs) {
          const out = []
          for (const inp of inputs) {
            const txB64 = toB64(inp.transaction)
            const summary = await window.__demoWalletDescribe(txB64)
            const done = await popup('approve', summary)
            const signed = await window.__demoWalletSign(txB64)
            done(true)
            out.push({ signedTransaction: new Uint8Array(signed) })
          }
          return out
        },
      },
      [`${ns}:signMessage`]: {
        version: '1.0.0',
        async signMessage(...inputs) {
          const out = []
          for (const inp of inputs) {
            const done = await popup('approve', { rows: [{ label: 'Sign message', value: `${inp.message.length} bytes` }] })
            const sig = await window.__demoWalletSignMessage(toB64(inp.message))
            done(true)
            out.push({ signedMessage: inp.message, signature: new Uint8Array(sig) })
          }
          return out
        },
      },
    },
  }

  const register = ({ register }) => register(wallet)
  window.addEventListener('wallet-standard:app-ready', ({ detail }) => register(detail))
  try { window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register })) } catch {}
  window.__demoWallet = { isConnected: () => connected }
}
