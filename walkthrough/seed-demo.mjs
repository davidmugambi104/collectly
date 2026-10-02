import { chromium } from 'playwright'
const BASE = 'http://127.0.0.1:5920'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true })
const p = await b.newPage()
await p.goto(BASE + '/dashboard/customers', { waitUntil: 'networkidle' })
const links = await p.$$eval('a[href^="/dashboard/customers/"]', (as) => as.map((a) => [a.getAttribute('href').split('/').pop(), a.textContent.trim().slice(0, 30)]))
const uniq = [...new Map(links.filter(([id]) => id && id !== 'customers').map(([id, n]) => [id, n])).entries()]
console.log('customers:', JSON.stringify(uniq.slice(0, 8)))
const day = 864e5, iso = (d) => new Date(Date.now() - d * day).toISOString()
const picks = uniq.filter(([id]) => id !== 'new').slice(3, 6); const days = [18, 9, 41]
for (let i = 0; i < picks.length; i++) {
  const [id] = picks[i]
  const r = await p.evaluate(async ([id, n, due]) => (await fetch('/api/invoices', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customerId: id, number: `DEMO-${n + 3}`, amount: String([4200, 9800, 1750][n - 1]), currency: 'USD', issueDate: due.issue, dueDate: due.due, description: 'Demo project work' }) })).status, [id, i + 1, { issue: iso(days[i] + 30), due: iso(days[i]) }])
  console.log('invoice', i + 1, 'status', r)
}
await b.close()
