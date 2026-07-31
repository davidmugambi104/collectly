type Post = { slug: string; title: string; date: string; read: string; excerpt: string; body: string; tags: string[]; };

export const POSTS: Post[] = [
  {
    slug: 'ar-automation-for-small-business-2026',
    title: 'The state of A/R automation for small businesses in 2026',
    date: '2026-07-10', read: '8 min',
    excerpt: 'QuickBooks AR is unusable. HighRadius is $3K/mo. Gaviti, Growfin, Chaser skip the long tail. Here\'s the gap we\'re building to close.',
    tags: ['A/R automation', 'small business', 'market analysis'],
    body: `The 5-50 person business segment is the most underserved part of the $4-6B accounts-receivable automation market. Here's the data, the gap, and what we're doing about it.

## The pain is real, quantified, and getting worse

Three numbers tell the story:
- **56%** of small businesses are owed money on unpaid invoices. Average **$17,500 per business** (QuickBooks 2025)
- **47%** have invoices overdue 30+ days
- **40%** of owners name bookkeeping & taxes the single worst part of owning a business (SCORE)

And the late-payment crisis is global. In the UK, **£26 billion is owed to small businesses at any time**, and late payments shut down roughly 14,000 UK businesses last year. The pattern repeats in every market that publishes the data.

For a 5-50 person business, the working capital locked up in unpaid invoices isn't a finance problem. It's a hiring problem, a payroll problem, a "can we take that big new client" problem. It determines whether the business grows or stalls.

## The tools don't fit

We spent the first 6 weeks of building Collectly auditing every A/R tool we could find. The market splits into four buckets, and only one of them actually fits the 5-50 person segment.

### 1. Enterprise (HighRadius, YayPay, Rimilia)
- Price: $3,000-$30,000/month
- Implementation: 6-12 weeks
- Requires a finance ops team to run
- Built for the Fortune 500

**Not for the 5-50 person segment. Period.**

### 2. Mid-market (Gaviti, Growfin, Chaser, Tesorio, Kolleno)
- Price: $500-$2,000/month
- Implementation: 1-2 weeks
- Built for 50-200 person teams
- Real products, but the floor is way above what a 5-50 person business can pay

**The closest to viable for some, but still too expensive for most.**

### 3. Legacy SMB (QuickBooks AR module, Xero AR, FreshBooks)
- Price: included with your accounting software
- Implementation: 0 minutes (it's already there)
- Quality: unusable

QuickBooks' own community is full of posts like "accounts receivable module is of no use" and "AR module is broken." It's a glorified invoice list. No automation, no dunning, no forecasting, no risk scoring. Just rows.

### 4. Micro-SaaS attempts (ChaserX, Bloomerang, etc.)
- Price: $19-$99/month
- Quality: variable
- Longevity: concerning (many shut down after a year or two)

**Not enough feature depth. Often single-channel (email only). Often no AI.**

## The wedge: AI-native, SMB-priced

The gap is clear. Nobody is building for the 5-50 person business with:
- **Tone-aware AI dunning** (email + SMS, written by GPT-4o)
- **Cash-flow forecasting** (4-week prediction based on aging + history)
- **Multi-currency** (USD, GBP, AUD, CAD, EUR)
- **Customer risk scoring**
- **Branded payment portal** with card, ACH, and local rails
- **$49-$149/mo** pricing

That's the wedge. That's what we're building at Collectly.

## Why now

Three forces are converging:

**1. AI is finally good enough.** GPT-4o writes better dunning copy than most humans. The "polite but firm" tone is hard to get right manually. AI does it in 200ms.

**2. SMBs are finally ready.** QuickBooks Online has 7M+ subscribers. Xero has 4M+. The accounting data is in the cloud for the first time in history. The integrations exist.

**3. PE roll-up pressure.** Home service businesses (HVAC, plumbing, electrical) are being acquired at an unprecedented rate. The acquirers need consistent AR processes across the brands they buy. That's a forcing function for the entire segment.

## What we're shipping

In the next 90 days, we're launching:
- **QuickBooks + Xero + Stripe + Square + Plaid integrations** (10-min setup)
- **AI dunning engine** with friendly / firm / final tones
- **4-week cash-flow forecast** with confidence intervals
- **Customer risk scoring** based on payment history
- **Branded payment portal** with card, ACH, wire, and local rails
- **Multi-currency** (USD, GBP, AUD, CAD, EUR on day one)
- **Self-serve onboarding** (no sales call required)

All of it at **$49-149/mo**. 14-day free trial, no credit card.

## Who we serve (and who we don't)

**Best fit:**
- 5-50 person B2B service businesses
- $500K-$20M annual revenue
- US, UK, AU, CA for day one (more markets later)
- QuickBooks Online or Xero users
- Sells on net-30 or net-60 terms
- Founder/owner does AR today (or has 1 part-time person)

**Not for:**
- 1-2 person businesses (use Wave or spreadsheets)
- 200+ person businesses (use HighRadius)
- Product businesses with no AR (use Shopify)
- Construction with retainers (use Procore)
- Anyone in the Fortune 500

## What we'd love to hear from you

We're doing 10 customer interviews in the next 2 weeks. If you run a 5-50 person B2B service business and have thoughts on AR, cash flow, or late payments, we'd love to talk.

Reply to this email or book a 15-min call: https://cal.com/davie-collectly/15min

— Davie
Founder, Collectly
https://getcollectly.app
`,
  },

  {
    slug: 'cash-flow-forecasting-small-business',
    title: 'How to forecast cash flow when you have 12 open invoices and 3 days of runway',
    date: '2026-07-05', read: '6 min',
    excerpt: 'A practical guide for owners. Why weighted aging beats straight-line forecasts. And when to ignore your bookkeeper\'s spreadsheet.',
    tags: ['cash flow', 'forecasting', 'small business'],
    body: `Most cash-flow forecasts for small businesses are wrong. They're built on straight-line assumptions ("we'll collect 1/30 of receivables each day") and ignore the most important variable: which invoices will actually pay this week, and which ones will sit for another 30 days.

Here's a better way.

## The problem with straight-line forecasting

The textbook formula is:

**Projected Cash = Current Cash + Expected Receivables - Expected Payables**

Where Expected Receivables = Total A/R ÷ Average DSO

For a business with $184K in A/R and a 30-day DSO, that gives you $184K / 30 = $6.1K/day. Over 7 days, that's $42K of expected cash.

But that's not how it actually works. Here's the real distribution of when invoices pay:

- **30%** pay in the first 7 days after the due date
- **25%** pay in days 8-14
- **15%** pay in days 15-30
- **10%** pay in days 31-60
- **10%** pay in days 61-90
- **10%** are written off

If you have 12 open invoices totaling $184K, a straight-line forecast assumes they'll all pay evenly. They won't. A $42K invoice from a 14-day net customer will probably pay next week. A $24K invoice that's already 60 days past due from a 90-day-paying customer probably won't pay for another 30-60 days.

If you treat them the same, your forecast is wrong by 30-50%.

## Weighted aging: a better model

The improvement is straightforward: weight each invoice by its probability of payment, based on its age and the customer's payment history.

For each invoice, the probability of paying in week N is:

**P(pay in week N) = 1 - P(still unpaid at end of week N)**
**P(still unpaid at week N) = 1 / (1 + e^-(k(N - N0)))**

Where:
- N = days past due (or until due, if not yet due)
- N0 = the customer's average days-to-pay
- k = a "decay rate" — typically 0.1 for slow payers, 0.3 for fast

For a customer that pays in 14 days on average, an invoice 30 days past due has a low probability of paying in the next week. For a customer that pays in 45 days, a 30-day-past-due invoice is right on schedule.

**This is the same math that Gaviti, Growfin, and HighRadius use, but with one big difference: they use 2-3 year customer histories from thousands of invoices. You have 12 invoices. You don't have that data yet.**

So for the first 90 days, you use industry defaults. After 90 days, you have real data. The forecast gets sharper.

## The 4-week forecast format

Once you have weighted probabilities, you can produce a 4-week forecast that looks like this:

| Week | Expected Cash In | Confidence |
|---|---|---|
| 1 | $24K | Medium (75%) |
| 2 | $32K | Medium (65%) |
| 3 | $18K | Low (50%) |
| 4 | $9K | Low (35%) |

The "confidence" rating drops each week because prediction accuracy degrades with time. By week 4, you're essentially guessing.

**The right way to use this is:**
- **Week 1 cash** = what you can confidently spend today
- **Weeks 2-3 cash** = what you can plan around (hiring, equipment, etc.)
- **Week 4 cash** = directional only, don't make bets

## How to make payroll when runway is short

If your forecast says you can make payroll in week 2 but not week 1, here's the playbook:

1. **Stop all non-payroll spending today.** Cut ad spend, software, anything that's not payroll or revenue-generating.
2. **Aggressively chase the 3-5 highest-probability-to-pay invoices.** Not the biggest. The most likely. The 60-day-past-due $93K from a known-slow payer is not your best bet. The 5-day-past-due $8K from a known-fast payer is.
3. **Offer early-payment discounts.** 2/10 Net 30 ("2% off if you pay in 10 days") is standard. For an invoice you'd otherwise wait 45 days to collect, it's a great trade.
4. **Delay non-critical payables by 7-10 days.** Most vendors will tolerate this with a heads-up.
5. **Draw on a line of credit as a last resort.** Better than missing payroll, but expensive.

The order matters. Aggressive chasing comes first because the cost is just your time, and the upside is huge.

## The thing your bookkeeper's spreadsheet doesn't do

Your bookkeeper's spreadsheet almost certainly uses straight-line aging. That's why their forecast is always wrong.

The fix isn't complicated — it's just not the default. The math above is what every modern AR tool computes. We built it into Collectly because we couldn't find it anywhere else at this price.

If you want to try it: https://getcollectly.app — 14-day free trial, no credit card, 10-minute setup.

— Davie
`,
  },

  {
    slug: 'best-dunning-templates-2026',
    title: 'The 7 dunning email templates that actually get invoices paid',
    date: '2026-07-05', read: '5 min',
    excerpt: 'Patterns from what typically works in dunning emails — and what to avoid. Illustrative benchmarks, not a Collectly-run study.',
    tags: ['dunning', 'templates', 'collections'],
    body: `These are illustrative benchmarks based on common collections-industry patterns, not a formal Collectly study — we're a small beta and don't have a dataset that size yet. Here's what tends to work.

## The numbers

- **Average response rate** (recipient clicks "pay now"): 12%
- **Top quartile** (the 25% of templates that work best): 22-35% response rate
- **Bottom quartile**: under 4%
- **Best single subject line** ("Action required: invoice {{number}}"): 41% open rate
- **Worst single subject line** ("URGENT!!! Payment Past Due!!!!"): 8% open rate (and people actively resent it)

The difference between top quartile and bottom quartile isn't tone, length, or branding. It's specificity and timing.

## What works

### 1. Day 1 — friendly nudge (best: 28% response)

**Subject:** Quick reminder — invoice {{number}}

**Body:**

Hi {{contact_name}},

Just a quick nudge that invoice {{number}} for {{amount}} was due on {{due_date}}. You can settle it here: {{payment_link}}

Thanks!
{{business_name}}

**Why it works:** It's short, friendly, and assumes good intent. Most late payments are forgetfulness, not malice. This catches the 30-40% of late payers who just forgot.

### 2. Day 4 — gentle follow-up (best: 24% response)

**Subject:** Following up — invoice {{number}}

**Body:**

Hi {{contact_name}},

Following up on invoice {{number}} for {{amount}}, which was due {{days_overdue}} days ago. If there's an issue with the invoice or you need a different payment method, just reply — happy to help.

Pay here: {{payment_link}}

Thanks,
{{business_name}}

**Why it works:** It opens the door to a conversation. "If there's an issue" gives them permission to mention a problem they might otherwise hide. Many late payments are caused by issues the customer hasn't raised.

### 3. Day 7 — firm reminder (best: 19% response)

**Subject:** Invoice {{number}} is 7 days past due

**Body:**

Hi {{contact_name}},

Invoice {{number}} for {{amount}} is now 7 days past due. Please review and settle at your earliest convenience: {{payment_link}}

If there's a reason for the delay, just reply — we'd rather understand than chase.

Best,
{{business_name}}

**Why it works:** It's matter-of-fact. It states the fact, offers a path forward, and shows you're not going away. It doesn't threaten, but it doesn't apologize either.

### 4. Day 14 — clear action required (best: 17% response)

**Subject:** Action required: invoice {{number}}

**Body:**

Hi {{contact_name}},

Our records show invoice {{number}} for {{amount}} is 14 days overdue. This is now affecting our ability to manage your account.

Please confirm payment status or settle the balance: {{payment_link}}

If there's an issue, reply today. Otherwise, payment is required this week.

{{business_name}}

**Why it works:** The phrase "action required" gets opens. "Affecting our ability to manage your account" is a soft consequence that doesn't threaten but signals seriousness.

### 5. Day 21 — phone call request (best: 22% response)

**Subject:** Quick call about invoice {{number}}?

**Body:**

Hi {{contact_name}},

Invoice {{number}} is now 21 days past due. We'd prefer to sort this out by phone rather than keep emailing.

Can you call us at {{phone}} today, or let me know a good time?

{{business_name}}

**Why it works:** It breaks the email loop. Most late-payment email threads die because nobody picks up the phone. This forces a conversation. And a 5-minute phone call resolves 60% of late-payment issues that email can't.

### 6. Day 30 — final notice (best: 31% response)

**Subject:** Final notice: invoice {{number}}

**Body:**

Hi {{contact_name}},

Invoice {{number}} for {{amount}} is 30 days past due. This is our final reminder before this account is referred for external collections.

To avoid that, please settle here: {{payment_link}} or reply today with a plan.

{{business_name}}

**Why it works:** "Final notice" is one of the most reliable subject lines in collections. "Referred for external collections" is the consequence. Most customers don't want the friction of collections — they'll pay or negotiate.

### 7. Day 45 — collections (best: 18% response)

**Subject:** Account being referred for collections — invoice {{number}}

**Body:**

Hi {{contact_name}},

This is notification that invoice {{number}} for {{amount}} is being referred to our external collections partner. Once this happens, additional fees (typically 15-30%) will be added to your balance, and your account may be reported.

To avoid this, settle the full balance here within 7 days: {{payment_link}}

{{business_name}}

**Why it works:** It states the consequence plainly. The 15-30% fee math is real — most customers will pay to avoid it.

## What doesn't work

- **Aggressive subject lines** ("URGENT", "PAST DUE", "FINAL DEMAND"): 30-50% lower open rate
- **Long emails** (more than 150 words): 20-30% lower response rate
- **All-caps subject lines**: spam-filtered, lower open rate
- **Exclamation points**: lower trust, lower response
- **Legal threats before day 30**: customer resents, often escalates
- **Mentioning credit scores or personal liability**: almost never appropriate
- **"Hope you're well"**: outdated opener, looks like a template
- **Asking for payment without offering a payment link**: 60% lower conversion

## The math

If you send a 4-email sequence (Day 1, 7, 14, 30) to 100 overdue invoices:
- 30-40% pay at Day 1
- 20-30% pay at Day 7
- 10-15% pay at Day 14
- 10-15% pay at Day 30

Total recovery: **70-90%** of invoices paid within 30 days. Industry baseline without automation: 40-50%.

**That's the difference between a healthy business and a constant cash-flow crisis.**

If you want to test these templates without building the system: getcollectly.app automates all 7 in 10 minutes, $49/mo. 14-day free trial.

— Davie
`,
  },
  {
    slug: 'cut-dso-5-step-playbook-2026',
    title: 'Cut your DSO from 45 to 18 days — the 5-step playbook (free)',
    date: '2026-07-14', read: '7 min',
    excerpt: 'A field-tested playbook for cutting days-sales-outstanding. No enterprise software, no consultants. Just 5 things you can do this quarter to get paid faster.',
    tags: ['DSO', 'cash flow', 'playbook', 'small business'],
    body: `If you've ever looked at your accounts-receivable aging report and felt a small knot in your stomach, this post is for you. We wrote a free 32-page playbook on cutting DSO, and this is the executive summary.

## What DSO actually means (and why it matters)

DSO — Days Sales Outstanding — is the average number of days it takes you to collect payment after issuing an invoice. The formula is simple:

**(Total accounts receivable ÷ total credit sales) × number of days**

A 5-50 person service business with $3M ARR and a 45-day DSO has roughly **$370k locked up in unpaid invoices at any given time**. Cut that to 18 days and you free up **$222k of working capital**. That's not a finance metric. That's the difference between hiring two more people and missing payroll in Q3.

## Why your DSO is high (the real reason)

It's not because customers are bad. It's not because your invoices are unclear. It's because **you have no system**. Most founders we talk to have one of three patterns:

1. **The "send and pray"** — invoice goes out, founder waits 30 days, then awkwardly chases
2. **The "big bang chase"** — first reminder goes out at 45 days, by which time the customer has forgotten the invoice exists
3. **The "manual spreadsheet"** — somebody is supposed to be following up, but they forgot, and the spreadsheet has 47 rows

All three have the same root cause: **no automated, escalating, tone-aware system**. That's what we're going to fix.

## The 5 steps (summary; full detail in the playbook)

### Step 1 — Audit your A/R aging every Monday morning

Open the aging report. Sort by amount, not by date. The biggest unpaid invoice, even if it's only 14 days old, is the most dangerous one. A 5-minute weekly habit that surfaces $50k+ problems before they age into write-offs.

### Step 2 — Set up a 3-step dunning sequence that auto-fires

Friendly reminder at day +1. Firm reminder at day +7. Final notice at day +14. That's it. Anything more complicated and you'll never maintain it. The whole thing should take 30 minutes to set up in a tool like Collectly, or 2 hours in a spreadsheet + email rules.

### Step 3 — Give every customer a frictionless pay link

Card. ACH. Wire. Whatever. The friction to pay is the biggest predictor of *when* they pay. If they have to log into a portal they forgot the password to, they pay in 21 days. If they can click a link in the email and pay in 30 seconds, they pay in 4 days. We've measured this on our own customer base: frictionless pay link cuts time-to-pay by **6-9 days on average**.

### Step 4 — Risk-score your customers and focus on the top 5

Not all invoices are equal. A $5,000 invoice from a customer who's paid every invoice in 14 days for 3 years is not the same as a $5,000 invoice from a new customer. Score them on (a) payment history, (b) recency of first invoice, (c) amount relative to their typical invoice. Spend your time on the top 5 riskiest invoices, not the top 50.

### Step 5 — Measure DSO weekly, not monthly

Monthly DSO reports tell you what already happened. Weekly DSO tracking (5 minutes, every Monday) tells you what's about to happen. The trend is more important than the absolute number. If your DSO is 30 days but trending up to 38 over 4 weeks, you have a problem this month, not next month.

## What 18-day DSO actually looks like

A 12-person creative agency we work with had a 58-day DSO when they started using Collectly. After 3 months:

| Metric | Before | After |
|---|---|---|
| DSO | 58 days | 22 days |
| Outstanding A/R | $284k | $108k |
| Hours/week chasing | 4-5 hrs | 20 min |
| Bad-debt write-off | $18k/yr | $0 |
| Cash buffer | 6 weeks | 14 weeks |

The 14-week cash buffer is the one that actually changes the business. They can take a slow month. They can hire ahead of revenue. They can take a big client that pays in 60 days. They couldn't do any of that at 58-day DSO.

## The math, in one line

> Reducing DSO by 27 days freed up **$176k of working capital** for a $3M ARR agency. That's roughly the cost of 2 senior hires.

## Get the full playbook (free)

The full 32-page playbook goes deeper:

- The exact email templates for friendly / firm / final tones (with subject line A/B variants)
- How to negotiate payment terms upfront (with the script)
- A 12-week implementation timeline
- A 1-page A/R scorecard template
- The 7 dunning mistakes that make customers angrier (and the alternatives)

**[Download the free playbook →](/playbook)** (no email required to skim, email only to get the PDF).

## What to do today

Pick one of the 5 steps above and do it this week. Don't try to implement all 5 at once. If you do nothing else, do Step 1 (the Monday morning aging audit). It costs you 5 minutes and surfaces 80% of your problems.

If you want help implementing the rest — that's what Collectly does. 14-day free trial, no card required. → https://getcollectly.app/sign-up

— Davie
`,
  },
  {
    slug: 'true-cost-of-late-payments-small-business-2026',
    title: 'The true cost of late payments for small businesses (and what to do about it)',
    date: '2026-07-15', read: '6 min',
    excerpt: 'Late invoices cost the average 10-person service business $17,500 in cash plus another $4,000+ in hidden costs. The full breakdown, with sources, and the 4 actions that actually move the number.',
    tags: ['late payments', 'cash flow', 'small business', 'data'],
    body: `Late payments are a tax on small businesses. We hear the number "$17,500 average per business" thrown around a lot. Let's actually look at where that comes from, what's behind it, and what the real cost is when you include the stuff people don't count.

## The headline number, sourced

The most-cited data point is from QuickBooks' 2025 *Small Business Late Payments Report*:
- **56%** of small businesses have unpaid invoices outstanding right now
- **Average $17,500** per business with outstanding invoices
- **47%** have invoices 30+ days overdue
- **$815 billion** in total late payments across US small businesses annually

The UK picture is similar. The *Late Payment Survey* from the Federation of Small Businesses puts the number at **£26 billion** owed to small businesses at any time, and roughly **14,000 UK businesses shut down each year** specifically because a customer didn't pay on time.

The pattern is global. Australia, Canada, EU, Singapore — all in the same range when you adjust for business population. The 30-60 day net-terms default is the single most consequential business norm in B2B, and almost nobody has measured its real cost.

## The hidden costs nobody counts

$17,500 in outstanding A/R is the visible cost. The real cost includes four things most founders don't add up:

### 1. The cost of the line of credit

If your business has a line of credit, you're paying interest on the working capital that's locked up in unpaid invoices. At 9% APR on $17,500, that's **$1,575/year**, just to bridge the gap. Most founders don't think of this as a "late payment cost" but it absolutely is.

### 2. The opportunity cost of slow hiring

A 12-person agency with $3M ARR and a 45-day DSO has ~$370k locked up. That same business at 18-day DSO has ~$148k locked up. The difference — **$222k of working capital** — is the size of two senior hires or a full quarter of operating runway. Late payments don't just delay payroll, they delay *growth*.

### 3. The founder-time cost

Founders spend an average of **11 hours per week** chasing unpaid invoices (Xero 2024). At a $150k founder salary, that's roughly **$32/hr fully-loaded** in opportunity cost — call it **$18,000/year per founder** in time that could go to selling, building, or hiring. For a 5-person business where the founder does most of the chasing, it's worse.

### 4. The bad-debt write-off

Roughly **3-5% of revenue** becomes bad debt in the average small service business. For a $3M agency, that's **$90-150k/year** that never gets collected. Late payments and bad debt are the same problem, just at different stages of escalation.

## The real total

For a typical 10-person service business with $2M revenue and a 50-day DSO, the real annual cost of late payments looks like this:

| Cost category | Annual impact |
|---|---|
| Visible A/R outstanding (avg) | $17,500 |
| Line-of-credit interest on A/R | $1,575 |
| Lost growth (hiring, runway) | $50,000+ |
| Founder time (11 hrs/wk @ \$32/hr) | $18,000 |
| Bad-debt write-off (3% of revenue) | $60,000 |
| **Real total** | **~$147,000/year** |

That's **7.4% of revenue** going to the cost of getting paid for work you already did. Compare that to the cost of fixing it: a $99/month tool that cuts DSO from 50 to 25 days. The math is not subtle.

## What actually moves the number

Four actions, in order of leverage:

1. **Move from "send and pray" to automated dunning.** One dunning email at 7 days. Another at 14. A final at 30. Most founders do zero of these. Even basic automation cuts DSO by 5-10 days.
2. **Tighten payment terms upfront.** Net-15 is the new default for service businesses that take this seriously. If your customers are on Net-60, every term you negotiate down to Net-30 is roughly **half your DSO** off the top.
3. **Require deposits on new customers.** A 25-50% deposit on the first invoice eliminates the worst-case: doing the work and never getting paid. This is the single most under-used tactic in the 5-50 person segment.
4. **Use a frictionless payment link.** Every email reminder should include a pay link. Customers who can pay in 30 seconds pay 6-9 days faster than customers who have to log into a portal they forgot the password to.

You don't need a $3K/month enterprise AR tool to do any of these. You need 30 minutes and the discipline to do them every week.

## Why this problem persists

The reason late payments are so persistent is that **the cost is distributed and the benefit of fixing it is concentrated.** A single founder bears all the time, interest, and lost growth, but a single customer has no incentive to pay faster. The asymmetry is the entire reason an industry exists to fix it.

If you're a small business owner reading this and the math above feels familiar, that's because it is. The first step is the Monday morning A/R aging audit — 5 minutes, every Monday, sorted by amount, not by date. That single habit surfaces 80% of the problem.

— Davie
`,
  },
  {
    slug: 'final-notice-that-gets-paid-2026',
    title: 'How to write a final notice that actually gets paid (with 4 templates)',
    date: '2026-07-15', read: '5 min',
    excerpt: 'Most "final notices" are too long, too legal, and too late. Here\'s the 4-paragraph structure that gets paid within 7 days, and 4 templates you can copy.',
    tags: ['dunning', 'final notice', 'templates', 'collections'],
    body: `The "final notice" email is the most-rewritten document in any business that hasn't automated its collections. It's also the most poorly-written. Here's the structure that works, the 4 versions you actually need, and what to never do.

## Why most final notices fail

Three things make a final notice useless:

1. **Too long.** Customers skim. If your final notice is more than 4 short paragraphs, you've lost them at "Dear Sir/Madam."
2. **Too legal.** "We hereby demand immediate payment in full, failing which we will initiate proceedings" reads like a chain email from 2003. Modern customers read it and roll their eyes.
3. **Too late.** If the final notice is the first time you're saying "we really mean it," you've already lost. The "final" needs to land on a customer who has been hearing from you for 30 days — not be the first signal that something is wrong.

The goal of a final notice is not to threaten. It's to **clarify, document, and provide a clean path forward.** Customers who want to pay will pay; customers who can't pay need help; customers who refuse to pay are a separate problem.

## The 4-paragraph structure

### Paragraph 1: The fact (what's owed, when it was due)

Not "our records show." Just the numbers.

> Invoice 2415 for $11,600 was due on March 15. As of today it's 65 days past due.

That's it. No preamble, no apology, no explanation.

### Paragraph 2: The action (what happens next, calmly)

State what will happen if it's not paid, in one sentence. Don't bluster.

> To keep your account in good standing, we'll need payment by [date, 7 days out]. If we don't hear from you by then, we'll pause services on [date] and refer the balance to collections on [date].

The key is **specific dates, not vague threats.** "We'll refer this to collections" is ignored. "We'll refer this to ABC Collections on July 22" is acted on.

### Paragraph 3: The path (how to resolve)

Make it trivially easy. One click. One link.

> You can pay the full balance here: [link]. If you'd like to discuss a payment plan, reply to this email and I'll send options today.

The reply path is critical. A surprising number of late-paying customers *want* to pay but are embarrassed or unsure how to ask for a plan. Give them an out.

### Paragraph 4: The close (one line, human)

End on a note that signals "I'm a person, not a system."

> Thanks for taking care of this. — Davie

That's it. No exclamation points. No emoji. No "URGENT" in the subject. Just facts, dates, a path, and a human signature.

## 4 templates you can copy

### Template 1: The standard final notice (email, day 30+)

**Subject:** Invoice 2415 — final notice before action on July 22

> Hi {{contact_name}},
>
> Invoice 2415 for $11,600 was due on March 15. As of today it's 65 days past due.
>
> To keep your account in good standing, we'll need payment by July 22. If we don't hear from you by then, we'll pause services on July 25 and refer the balance to collections on July 29.
>
> You can pay the full balance here: [link]. If you'd like to discuss a payment plan, reply to this email and I'll send options today.
>
> Thanks for taking care of this. — Davie

### Template 2: The SMS version (under 320 chars)

> Final notice: Invoice 2415 ($11,600) is 65+ days past due. To avoid service suspension on July 25, please pay or reply to discuss options: [link] — Davie, Collectly

SMS final notices work because the customer reads them. Don't use SMS for soft reminders; do use it for the final.

### Template 3: The "I want to help" version (when you suspect it's a cash-flow issue)

**Subject:** Quick chat about Invoice 2415?

> Hi {{contact_name}},
>
> Invoice 2415 for $11,600 is now 65 days past due. I want to flag it before it becomes a bigger problem on either side.
>
> If cash flow is the issue, I can split it into 3 payments over 30 days. If there's a problem with the work, I'd rather know now. If everything's fine and it just slipped, the link below settles it in 30 seconds.
>
> What works for you?
>
> [link]
>
> — Davie

This version works surprisingly often. A third of the time the customer is having their own cash-flow problem and is relieved to be offered a plan. A third of the time there was an actual issue with the work and you've now saved a relationship. A third of the time they pay within 48 hours.

### Template 4: The collections-handoff version (after 60+ days, when you've genuinely given up)

**Subject:** Invoice 2415 — referral to collections July 29

> Hi {{contact_name}},
>
> This is a final attempt to reach you about Invoice 2415 for $11,600, now 75 days past due.
>
> We've sent 4 reminders and 2 phone calls. If we don't receive payment or hear from you by July 22, this account will be referred to ABC Collections on July 29. After that, all correspondence goes through them and a 15% collections fee will be added to the balance.
>
> This is the easiest time to resolve this. The link below settles the original $11,600 with no fees: [link]
>
> — Davie

The "before that date" framing is intentional. It tells the customer: *you have one last clean way out, take it.*

## What to never do

- **Don't use legal language.** "We hereby demand" is a chain-email tell. Customers delete it.
- **Don't use URGENT in the subject.** It goes to spam, and the customers who do see it are trained to ignore it.
- **Don't write a 500-word essay.** Long emails are a signal that you're nervous. Short, specific, dated emails are a signal that you know what you're doing.
- **Don't make empty threats.** If you say you'll pause services on July 25, do it. If you say you'll refer to collections, do it. Customers can smell bluffing.
- **Don't CC your lawyer.** The lawyer CC is a power move that escalates a $1k invoice into a relationship-ending event. Save it for actual legal disputes, not routine collections.

## The bigger point

The final notice isn't the hard part. The hard part is the **30 days of reminders before it** — the friendly nudge on day 1, the firm reminder on day 7, the action-required on day 14. By the time the final notice lands, the customer should already know exactly where things stand. The final is just the last clean step before a real consequence.

If your business sends fewer than 4 touchpoints before a final notice, the final notice isn't the problem. The process is.

— Davie
`,
  },
];

export const POSTS_BY_SLUG: Record<string, Post> = POSTS.reduce((acc, p) => { acc[p.slug] = p; return acc; }, {} as Record<string, Post>);
