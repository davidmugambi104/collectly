// Mugavi walkthrough: 8 scenes, about two and a half minutes, on FAKE demo data only.
// The app runs from demo-server.sh (in-memory database seeded with made-up customers, a mail stand-in that
// never sends). Every claim in the narration is one the marketing brief (file 15) backs.
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const here = path.dirname(fileURLToPath(import.meta.url))

export const VOICE = process.env.VOICE ?? 'Puck'
export const VOICE_INSTRUCTIONS = 'Narrate like a calm, friendly person explaining a tool they like to a busy business owner: warm, clear, unhurried, never salesy.'

export const THEME = {
  bg: '#0b0d14', bg2: '#141829', ink: '#eceefa', dim: '#9aa0bd', dim2: '#6b7190',
  accent: '#8b7cf6', accentRgb: '139,124,246', line: '#eceefa2e',
  font: { family: "'Inter', ui-sans-serif, system-ui, sans-serif", googleCss: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
}

export const LAYOUT = {
  canvas: { w: 3840, h: 2160 },
  rail: { x: 90, y: 200, w: 680, h: 1761, brand: 'mugavi', tag: 'walkthrough', footPrefix: 'try it →' },
  window: { x: 850, y: 200, w: 2900, h: 1761, bar: 130, radius: 26 },
  get content() { return { x: this.window.x, y: this.window.y + this.window.bar, w: this.window.w, h: this.window.h - this.window.bar } },
  logicalWidth: 1280,
  url: 'mugavi.com',
  tabTitle: 'Mugavi · invoice reminders you approve first',
  favicon: 'M',
}

export const INTRO_LINES = [
  { text: 'late invoices, handled', anchor: 'late invoices' },
  { text: 'you approve every reminder', anchor: 'approve every one' },
  { text: 'nothing sends unseen', anchor: 'whole flow' },
]

export const CHAIN = { id: 'default', name: 'Mugavi', textReplace: [] }

export const CARDS = () => ({
  intro: { brandHtml: 'MUGA<b>VI</b>', tagline: 'reminders you approve first', corner: LAYOUT.rail.brand, chip: 'walkthrough', foot: 'demo data only' },
  outro: { kicker: 'Try it free', url: LAYOUT.url, corner: LAYOUT.rail.brand, foot: 'approve first · your words · your address', pills: [] },
})

// Everything on screen is fake: made-up customers and `example.test` addresses from the app's own demo seed.
const consent = JSON.stringify({ analytics: false, advertising: false, decidedAt: new Date().toISOString(), version: 1 })

export const APP = {
  url: 'http://127.0.0.1:5920/dashboard',
  local: false, // demo-server.sh is started by hand before recording (never a build step mid-take)
  readySelector: '#main',
  zoomCss: () => '',
  hideSelectors: ['nextjs-portal', '[data-nextjs-toast]', '.alert-danger'],
  initScripts: () => [
    `try { localStorage.setItem('collectly_consent', ${JSON.stringify(consent)}); localStorage.setItem('collectly.dunning.tour.v1', 'done'); } catch {}`,
  ],
}

const click = async (api, sel, opts) => { try { await api.click(sel, opts) } catch (e) { api.log?.(`skip click ${sel}: ${e.message}`) } }
const ready = async (api, sel) => { try { await api.waitFor(sel, { timeout: 20000 }) } catch (e) { api.log?.(`not ready ${sel}: ${e.message}`) } }
const hover = async (api, sel, opts) => { try { await api.hover(sel, opts) } catch (e) { api.log?.(`skip hover ${sel}: ${e.message}`) } }

export const storyboard = {
  lead: 0.35,
  tail: 0.9,
  scenes: [
    {
      id: 'intro', card: 'intro', lead: 0.6, tail: 0.6,
      narration: 'Chasing late invoices is the job nobody wants. Mugavi writes the reminders, but you approve every one first. Here is the whole flow in under a minute and a half.',
      async run(api) { await api.moveTo([api.cfg.width * 0.5, api.cfg.height * 0.55], { duration: 1400 }) },
    },
    {
      id: 'connect',
      caption: { label: 'step 01', title: 'Connect your books', sub: 'QuickBooks or Xero' },
      narration: 'First, connect your books. Mugavi reads your customers and open invoices from QuickBooks or Xero. It never emails anyone just because it can.',
      async run(api) {
        await api.wait(900)
        await click(api, 'a[href="/dashboard/integrations"]')
        await ready(api, 'text=Sync now')
        await api.wait(900)
        await hover(api, 'text=QuickBooks Online', { duration: 900 })
        await api.wait(1200)
        await hover(api, 'text=Sync now', { duration: 900 })
        await api.wait(1500)
      },
    },
    {
      id: 'overdue',
      caption: { label: 'step 02', title: 'Overdue invoices appear', sub: 'Oldest first, with what happens next' },
      narration: 'As soon as it syncs, your overdue invoices appear, oldest first, with what happens to each one next.',
      async run(api) {
        await click(api, 'a[href="/dashboard/invoices"]')
        await ready(api, 'table tbody tr')
        await api.wait(900)
        await hover(api, 'text=NEXT REMINDER', { duration: 900 })
        await api.wait(1400)
        await hover(api, 'table tbody tr >> nth=2', { duration: 900 })
        await api.wait(1200)
      },
    },
    {
      id: 'aged',
      caption: { label: 'step 03', title: 'See where the money is stuck', sub: 'Aged receivables by customer' },
      narration: 'The aged receivables report shows who owes what and how late, so you know where the money is stuck.',
      async run(api) {
        await click(api, 'a[href="/dashboard/reports/aged"]')
        await ready(api, 'text=Aged receivables by customer')
        await api.wait(1000)
        await hover(api, 'table tbody tr >> nth=0', { duration: 1000 })
        await api.wait(1800)
      },
    },
    {
      id: 'drafts',
      caption: { label: 'step 04', title: 'Reminders wait for you', sub: 'Drafted, never sent on their own' },
      narration: 'On its daily run, Mugavi drafts the reminders that are due, in a tone that fits how late the invoice is. They wait here. Nothing goes to a customer until you say so.',
      async run(api) {
        await click(api, 'a[href="/dashboard/dunning"]')
        await ready(api, 'text=Approve and send')
        await api.wait(1200)
        await hover(api, 'text=Approve before sending', { duration: 900 })
        await api.wait(1500)
        await hover(api, 'text=Subject >> nth=0', { duration: 1000 })
        await api.wait(1800)
      },
    },
    {
      id: 'approve',
      caption: { label: 'step 05', title: 'Approve, with a way back', sub: '30 seconds to change your mind' },
      narration: 'Read it, edit it if you like, then approve. After you press send, you get thirty seconds to undo before it leaves.',
      async run(api) {
        await click(api, 'text=Approve and send >> nth=0')
        await api.wait(2600)
        await hover(api, 'text=Undo', { duration: 900 })
        await api.wait(2200)
      },
    },
    {
      id: 'reply',
      caption: { label: 'step 06', title: 'Replies stop the chasing', sub: 'Read first, then decide' },
      narration: 'When a customer replies, it lands in your inbox with a suggested next step, and reminders for that invoice pause until you have read it.',
      async run(api) {
        await click(api, 'a[href="/dashboard/inbox"]')
        await ready(api, 'text=Recommended')
        await api.wait(900)
        await hover(api, 'text=Harbor Painting Co >> nth=0', { duration: 1000 })
        await api.wait(1500)
        await hover(api, 'text=Recommended >> nth=0', { duration: 900 })
        await api.wait(1800)
      },
    },
    {
      id: 'outro', card: 'outro', lead: 0.8, tail: 1.2,
      narration: `That is Mugavi: reminders you approve first. Try it free at ${LAYOUT.url.replace(/\./g, ' dot ')}.`,
      async run(api) { await api.moveTo([api.cfg.width * 0.5, api.cfg.height * 0.6], { duration: 1200 }) },
    },
  ],
}

export const narrationLines = storyboard.scenes.map((s) => ({ id: s.id, text: s.narration }))
