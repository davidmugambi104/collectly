# COLLECTLY WEBSITE — FULL AUDIT, REDESIGN, AND IMPLEMENTATION BRIEF
**Date:** 2026-07-26  
**Prepared for:** Davie Mugambi, Founder  
**Purpose:** Convert founder-led LinkedIn conversations into first 10 paying customers

---

## A. Executive Summary

**Current website readiness:** 58/100. The site has strong foundational copy and honest positioning but suffers from critical trust gaps (fake customer stories on /customers), incomplete product proof (no real videos), and confusing pricing (three tiers when you need two).

**Largest trust risk:** The `/customers` page displays three fabricated case studies ("Lumen & Co", "Westgate Advisory", "Brightline Legal") with invented metrics ($2.4M ARR, DSO 47→14 days, $28K recovered/mo). A LinkedIn prospect who clicks this page will immediately lose trust.

**Largest conversion risk:** The primary CTA is "Start free 14-day trial," but a new user cannot complete the core workflow without founder assistance (production credentials needed for QBO/Xero/Stripe). This creates false expectations and early churn.

**Strongest existing element:** The "Live product status" banner and honest integration-status labels on `/integrations` demonstrate refreshing transparency. The AI dunning interactive demo is excellent proof-of-product.

**Most important immediate improvement:** Replace fake testimonials with anonymized beta-user quotes or remove the /customers page entirely. Change primary CTA to "Book a founder walkthrough" until self-serve onboarding is truly frictionless.

---

## B. Verified Capability Matrix

| Capability | Current status | Tested flow | Credentials needed | Customer-visible limitation | Website claim | Required correction | Priority |
|---|---|---|---|---|---|---|---|
| QuickBooks Online | Sandbox | OAuth route built, sandbox tested | Yes — production app credentials | Cannot import real invoices | "Connect your books" implies live | Add "Sandbox — production keys swapped on setup call" | Critical |
| Xero | Needs credentials | OAuth callback ready | Yes — verify first connection | Unknown if production works | Listed as integration | Add "Needs verification — we help on first call" | High |
| Plaid | Live | Read-only bank feeds | Yes — user's Plaid creds | None | Correctly labeled | Keep as-is | — |
| Stripe | Test mode | Webhook reconciliation tested | Yes — production keys | US/UK/AU/CA payments not live | "Stripe coming with your production keys" | Correct | Medium |
| Square | Sandbox | OAuth tested end-to-end | Yes — Square production approval | Cannot process real payments | Correctly labeled sandbox | Keep as-is | — |
| Paystack | Live | Live keys verified | Yes — user's Paystack creds | NG/GH/KE/ZA only | Correctly labeled | Keep as-is | — |
| Resend (email) | Live | Transactional delivery | Yes — user's domain | Must bring own sending domain | Correctly labeled | Keep as-is | — |
| Twilio (SMS) | Test mode | SMS route built | Yes — A2P registration for US | US SMS not compliant yet | "Test mode" correct | Keep as-is | — |
| AI dunning (Gemini) | Live | Tone-aware generation | No — uses Google Gemini key | No financial data sent | Correctly labeled | Keep as-is | — |
| Cash-flow forecast | Live (illustrative) | 4-week projection | Requires Plaid + history | Low confidence without 5+ paid invoices | "Tells you when you can make payroll" overpromises | Add "Requires 30+ days of payment history" | Medium |
| Branded payment portal | Partial | UI exists, Stripe test only | Stripe/Square/Paystack prod keys | Customers cannot actually pay in US/UK | "Customers click, pay, settle" | Add "Live with Paystack; US/UK needs prod keys" | Critical |
| AR aging dashboard | Live | Real-time buckets | Requires QBO/Xero data import | Empty without integration | Correct | Keep as-is | — |
| Pause-on-reply logic | Unverified | Code exists | Email provider IMAP access | May not work without full email integration | Claimed in features | Verify and label "Beta" | High |
| Cash application AI | Unverified | Matching logic exists | Payment webhook data | Not tested with real payments | "Auto-matches incoming payments" | Label "Beta — manual review recommended" | Medium |
| Multi-currency | Partial | USD/GBP/AUD/CAD/EUR supported | FX rates via API | KES/NGN/ZAR requires Scale plan | Correct | Keep as-is | — |
| Multi-entity | Planned | UI placeholder | N/A | Not implemented | "Multi-entity support (Growth+)" | Remove until shipped | High |
| User roles + audit log | Partial | Clerk auth, events table | N/A | Roles UI may be incomplete | "SOC 2-ready permissions" | Change to "Role-based access (Clerk)" | Medium |

---

## C. Critical Issues

### Issue 1: Fake customer testimonials on /customers
- **Page:** `/customers`
- **Existing content:** Three named companies with specific ARR, DSO improvements, and quotes
- **Problem:** Fabricated social proof destroys trust instantly
- **Evidence:** `src/app/customers/page.tsx` lines 7–15 show STORIES array with fake names
- **Conversion impact:** High — LinkedIn prospects will verify these companies don't exist
- **Exact replacement:** Remove entire STORIES array. Replace with single anonymized quote: "Beta user, B2B services firm, 5–50 people" with generic outcome
- **Implementation instruction:** Edit `src/app/customers/page.tsx`, replace STORIES with one card reading "Early customer program — join the first 20"
- **Priority:** Critical — fix before any LinkedIn outreach

### Issue 2: Primary CTA promises self-serve but requires founder help
- **Page:** Homepage hero, all CTAs
- **Existing content:** "Start free 14-day trial" as primary button
- **Problem:** User signs up, cannot connect QBO/Xero live, cannot accept real payments, feels stuck
- **Evidence:** Integrations page shows "sandbox", "test-mode", "needs-credentials" for core flows
- **Conversion impact:** Critical — early churn, negative word-of-mouth
- **Exact replacement:** Change primary CTA to "Book a founder walkthrough" with secondary "Watch 90-sec demo"
- **Implementation instruction:** Edit `src/app/page.tsx` lines 44–50, swap href and copy
- **Priority:** Critical

### Issue 3: Pricing page shows three tiers, creates paralysis
- **Page:** `/pricing`
- **Existing content:** Starter $49, Growth $99, Scale $199
- **Problem:** First 10 customers should not compare three plans; they need one obvious choice
- **Evidence:** `src/app/pricing/page.tsx` renders three cards
- **Conversion impact:** Medium — decision fatigue delays signup
- **Exact replacement:** Collapse to two plans: "Founding Customer $49/mo" and "Growth $99/mo". Mark Founding as "First 20 only"
- **Implementation instruction:** Already partially done in `src/lib/utils.ts` PLAN_PRICING; update homepage to match
- **Priority:** High

### Issue 4: Product tour page shows empty video placeholders
- **Page:** `/tour`
- **Existing content:** Five video cards with "record as Loom" notes visible
- **Problem:** Internal instructions exposed publicly; looks unfinished
- **Evidence:** `src/app/tour/page.tsx` lines 16–35 show embed: null
- **Conversion impact:** Medium — reduces perceived product maturity
- **Exact replacement:** Replace with single section: "Book a founder walkthrough — we'll show you exactly how it works for your business"
- **Implementation instruction:** Edit `src/app/tour/page.tsx`, remove video grid, add Calendly embed or contact form
- **Priority:** High

### Issue 5: Security page claims "GDPR compliant" without DPA infrastructure
- **Page:** `/security`
- **Existing content:** Table shows "GDPR + UK GDPR + CCPA compliant — enforced"
- **Problem:** Compliance is a legal status, not a feature; no evidence of DPA, SCCs, or counsel review
- **Evidence:** `src/app/security/page.tsx` line 102
- **Conversion impact:** Medium — sophisticated buyers will question this
- **Exact replacement:** Change to "GDPR-aligned controls · DPA available on request"
- **Implementation instruction:** Edit line 102, add footnote "Not legal advice; consult counsel for your use case"
- **Priority:** Medium

### Issue 6: Homepage hero dashboard mock uses same fake company names
- **Page:** Homepage
- **Existing content:** HeroDashboardMock shows "Brightline Legal", "Westgate Advisory", "Northstar Marketing"
- **Problem:** Reinforces fake testimonial problem
- **Evidence:** `src/app/page.tsx` lines 280–305
- **Conversion impact:** Medium — observant visitors notice pattern
- **Exact replacement:** Use generic names: "Acme Corp", "Design Studio LLC", "Consulting Group"
- **Implementation instruction:** Edit HeroDashboardMock component, replace names
- **Priority:** Medium

### Issue 7: "SOC 2-grade security" is misleading
- **Page:** Homepage pricing section
- **Existing content:** "SOC 2-grade security" listed as included feature
- **Problem:** "SOC 2-grade" is not a real certification level
- **Evidence:** `src/app/page.tsx` line 234
- **Conversion impact:** Low-Medium — enterprise buyers will flag this
- **Exact replacement:** "Security controls inspired by SOC 2 requirements"
- **Implementation instruction:** Edit line 234
- **Priority:** Low

---

## D. Homepage Redesign

### Section order (new)

1. **Hero** — Problem statement + founder-led CTA
2. **Product proof** — Real screenshot with annotations (not mock)
3. **Five-step workflow** — Visual timeline
4. **What is live today** — Honest status grid
5. **Use-case outcomes** — Bulleted benefits
6. **Founder trust** — Photo, name, LinkedIn, promise
7. **Interactive AI demo** — Keep existing DunningDemo
8. **Pricing** — Two plans only
9. **Free A/R audit** — Lower-commitment CTA
10. **FAQ** — Address objections
11. **Final CTA** — "Book a founder walkthrough"

### Exact copy per section

#### Section 1: Hero
**Headline:** Stop chasing late invoices.  
**Supporting copy:** Collectly connects to your accounting system, follows up with customers, makes it easier to pay, and shows when cash is likely to arrive. Built for small B2B service businesses using QuickBooks or Xero.  
**Primary CTA:** Book a founder walkthrough  
**Secondary CTA:** Watch the 2-minute overview  
**Supporting note:** Founder-led onboarding for early customers. Some integrations require production credentials or are currently in test mode.

#### Section 2: Product proof
**Visual instruction:** Replace HeroDashboardMock with actual screenshot from `src/app/dashboard/page.tsx` showing:
- Outstanding A/R KPI
- Overdue amount
- At least one real invoice row (use seeded demo data)
- Add annotation arrows pointing to: "See total owed", "Drill into overdue", "Click to send reminder"

#### Section 3: Five-step workflow
1. Connect your books (QuickBooks or Xero OAuth)
2. Sync open invoices (customers, balances, due dates)
3. Automate follow-ups (tone-aware email + SMS)
4. Give customers an easier way to pay (branded portal)
5. See when cash is expected (4-week forecast)

#### Section 4: What is live today
**Live today:**
- A/R dashboard
- Invoice tracking
- Email reminders
- Reminder drafting (AI)
- Cash-flow forecast (requires 30+ days history)

**Requires setup or credentials:**
- QuickBooks and Xero production connections (sandbox ready)
- Payment-provider connections (Paystack live; Stripe/Square test)
- Regional payment rails (US/UK ACH needs prod keys)

**In test mode:**
- SMS in selected regions (Twilio A2P pending)
- Certain reconciliation workflows
- Cash application AI (beta)

#### Section 5: Use-case outcomes
- Spend less time manually following up
- Avoid forgetting overdue invoices
- Keep reminder tone professional
- Pause automation when a customer replies
- See which payments are likely to arrive
- Identify risky accounts earlier

#### Section 6: Founder trust
**Photo:** Headshot of Davie (provide URL or local path)  
**Name:** Davie Mugambi  
**Short message:** I built Collectly after watching too many small teams lose hours every week chasing invoices. The existing tools were either too expensive for 5–50 person businesses or too weak to actually move the needle on cash flow.  
**LinkedIn:** https://www.linkedin.com/in/davie-mugambi/  
**Personal onboarding promise:** I am personally onboarding Collectly's early customers. I will help connect your accounting system, review your reminder workflow, and tell you directly if the current product is not ready for your setup.  
**Response expectations:** I reply within 2 hours during Nairobi business hours (EAT, GMT+3).

#### Section 7: Interactive AI demo
Keep existing `DunningDemo` component. Add heading: "Try the AI before you sign up — no data stored."

#### Section 8: Pricing
**Founding Customer — $49/mo**
- One company
- One accounting connection
- Unlimited open invoices
- Email reminder workflows
- Cash-flow forecast
- Founder-led onboarding
- Direct support
- Early-customer price protection for 12 months

**Growth — $99/mo**
- Everything in Founding
- SMS dunning
- Payment portal (Paystack live; Stripe/Square test)
- Multi-currency (USD, GBP, AUD, CAD, EUR)
- Up to 10 users
- Unlimited invoices

**Availability note:** Payment methods, SMS, and accounting integrations depend on region, provider approval, and production credentials. Availability will be confirmed before billing.

#### Section 9: Free A/R Audit
**Heading:** Get a free A/R health check  
**Copy:** Send us your current follow-up process and we'll reply with three practical recommendations — no obligation to purchase Collectly.  
**Form fields:** Name, Company, Email, Monthly invoice volume, Current tool (dropdown: QuickBooks/Xero/Manual/Other)

#### Section 10: FAQ
Answer the 12 questions from the brief (Section 12). Key additions:
- "Which features are still in test mode?" → List SMS, Stripe/Square payments, cash application AI
- "Does Collectly change my accounting records?" → No, read-only by default; payments sync back with your approval

#### Section 11: Final CTA
**Heading:** Stop being the one who has to ask.  
**Supporting copy:** Bring one real overdue-invoice workflow. We will review whether Collectly fits it.  
**Button:** Book a founder walkthrough

---

## E. Page-by-Page Plan

### Homepage (`/`)
- **Purpose:** Convert LinkedIn prospects to demo bookings
- **Keep:** AI dunning demo, honest status banner, founder section
- **Change:** Hero CTA, remove fake stats strip, simplify pricing to two tiers
- **Add:** Real product screenshot with annotations, five-step workflow visual
- **CTA:** Book a founder walkthrough (primary), Watch 2-min overview (secondary)
- **Status disclosure:** "Some integrations require production credentials" in hero footer
- **Mobile notes:** Stack workflow steps vertically; ensure CTA buttons are 44px min height

### Features (`/features`)
- **Purpose:** Educate on capabilities
- **Keep:** Six feature cards with accurate descriptions
- **Change:** Remove "Multi-entity" bullet until shipped; add "(Beta)" to cash application AI
- **Add:** Status badge per feature (Live/Beta/Test)
- **CTA:** Book a founder walkthrough
- **Mobile notes:** Cards stack well; test at 320px

### Pricing (`/pricing`)
- **Purpose:** Reduce decision friction
- **Keep:** Honest "what you will never pay for" section
- **Change:** Remove Starter/Scale; show only Founding/Growth; add availability disclaimer
- **Add:** Comparison to Chaser ($259/mo) as anchor
- **CTA:** Start free (with note: "We'll help with setup")
- **Mobile notes:** Stack plans vertically; highlight Founding as recommended

### Integrations (`/integrations`)
- **Purpose:** Set accurate expectations
- **Keep:** Category structure, status badges
- **Change:** Add "Last verified: 2026-07-26" date; clarify "Sandbox = needs production keys"
- **Add:** Request-an-integration form with public roadmap link
- **CTA:** See security details
- **Mobile notes:** Cards stack; status badges remain visible

### About (`/about`)
- **Purpose:** Build founder trust
- **Keep:** Davie's story, mission, target segment
- **Change:** Add headshot, LinkedIn/X/email links, response-time promise
- **Add:** "Where we are" — Nairobi, distributed team, design partners
- **CTA:** Book a founder walkthrough
- **Mobile notes:** Photo scales; text remains readable

### Security (`/security`)
- **Purpose:** Answer enterprise buyer questions
- **Keep:** Principles, controls table, incident response
- **Change:** Downgrade "GDPR compliant" to "GDPR-aligned"; add DPA availability note
- **Add:** Subprocessor list (Vercel, Postgres provider, Google Gemini, Resend, Twilio)
- **CTA:** Email security team
- **Mobile notes:** Table scrolls horizontally; controls remain legible

### Tour (`/tour`)
- **Purpose:** Show product in action
- **Keep:** Interactive AI demo
- **Change:** Remove empty video placeholders; replace with Calendly embed or "Book walkthrough" CTA
- **Add:** Note: "Videos coming soon — for now, book a live walkthrough"
- **CTA:** Book a founder walkthrough
- **Mobile notes:** Demo component is responsive; test spacing

### Customers (`/customers`)
- **Purpose:** Social proof (currently broken)
- **Keep:** Nothing — entire page is fake
- **Change:** Delete all three case studies
- **Add:** Single card: "Early customer program — join the first 20 founding customers at $49/mo with lifetime price lock"
- **CTA:** Book a founder walkthrough
- **Mobile notes:** Single card centers well

### Contact (`/contact`)
- **Purpose:** Capture inbound leads
- **Keep:** Form
- **Change:** Add "We reply within 2 hours during Nairobi business hours"
- **Add:** Calendar embed as alternative to form
- **CTA:** Submit inquiry
- **Mobile notes:** Form fields stack; submit button full-width

### Blog/Changelog/Compare/Interview/Playbook
- **Purpose:** Resources (low priority)
- **Recommendation:** Hide from main nav until content exists; keep URLs live for SEO
- **Action:** Remove from header; add to footer only

---

## F. Navigation Redesign

### Desktop navigation (new)
- Logo → Home
- Demo → /tour (or remove; link direct to booking)
- Features → /features
- Pricing → /pricing
- Founder → /about
- **Contact** → /contact (highlighted with sparkle icon)

Remove: Blog, Changelog, Compare, Interview, Playbook, Customers, Security (move to footer)

### Mobile navigation (new)
Same order as desktop, with hamburger menu. Add "Sign in" and "Start free" buttons at bottom of drawer.

### Footer navigation
- Product: Features, Pricing, Integrations, Security, Roadmap (future)
- Resources: Blog (future), Changelog (future), Help Center (future)
- Company: About, Contact, Careers (future)
- Legal: Privacy, Terms, DPA
- Social: LinkedIn, X/Twitter

---

## G. Pricing Recommendations

### Option 1: Conservative (recommended for first 10 customers)
**Single plan: Founding Customer — $49/mo**
- All features unlocked
- Founder onboarding included
- Lifetime price lock
- Limited to first 20 customers
- After 20, price increases to $99/mo

**Rationale:** Eliminates decision paralysis. Early customers feel special. Simple messaging: "$49/mo while we're in beta."

### Option 2: Two-tier (current direction)
**Founding Customer — $49/mo** + **Growth — $99/mo**
- Founding: First 20, all features, price lock
- Growth: After founding cohort, adds SMS, payment portal, multi-currency

**Rationale:** Creates urgency for Founding slot. Growth tier justifies higher price later.

### Option 3: Value-based (after 100 customers)
**Starter — $79/mo** (up to 50 invoices)  
**Growth — $149/mo** (unlimited invoices, SMS, payments)  
**Scale — $299/mo** (multi-entity, API, priority support)

**Rationale:** Aligns price with value (invoice volume). Introduces after product-market fit is proven.

**Recommendation:** Start with Option 1 for first 10 customers. Switch to Option 2 after 20 founding slots fill.

---

## H. LinkedIn Conversion System

### Recommended landing pages
1. **Homepage** — General LinkedIn traffic
2. **/vs-chaser** — Prospects comparing tools
3. **/ar-audit** — Low-commitment entry point
4. **/founder-demo** — Personalized demo booking (create this page)

### UTM structure
```
utm_source=linkedin
utm_medium=founder_outreach
utm_campaign=first_10_customers
utm_content={industry_or_message_variant}
```

Example: `https://getcollectly.app?utm_source=linkedin&utm_medium=founder_outreach&utm_campaign=first_10_customers&utm_content=marketing_agency`

### CTA journey
1. **Cold prospect** (received connection request) → Homepage → "Watch 2-min overview" → Email capture
2. **Warm prospect** (replied to message) → /ar-audit → Free audit form → Founder email follow-up
3. **Interested prospect** (asked for demo) → /founder-demo → Calendly booking → Demo call

### ChatGPT-assisted personalization connection
- ChatGPT researches prospect's company size, industry, likely pain points
- Generates personalized LinkedIn message referencing their specific situation
- Message includes link with UTM parameters tracking industry/message variant
- Landing page dynamically shows industry-specific headline if UTM matches (future enhancement)

---

## I. Product Advancement Roadmap

### Before first customer (Critical)
1. Remove fake testimonials from /customers
2. Change primary CTA to "Book a founder walkthrough"
3. Record one real 2-minute product overview video
4. Verify QBO/Xero sandbox flows work end-to-end
5. Add availability disclaimers to payment integrations

### Before first 10 customers (High)
1. Build self-serve QBO/Xero production onboarding (OAuth + credential swap)
2. Enable Stripe production for US/UK payments
3. Implement pause-on-reply logic with IMAP integration
4. Create industry landing pages (agencies, MSPs, consultants)
5. Build ROI calculator

### Before first 100 customers (Medium)
1. Multi-entity support
2. Advanced reporting (aging exports, CSV/PDF)
3. Slack/Teams notifications
4. Public API for custom integrations
5. Partner program for bookkeepers/accountants

---

## J. Implementation Roadmap

### Next 48 hours (Critical trust fixes)
- [ ] Remove fake STORIES from `src/app/customers/page.tsx`
- [ ] Replace hero CTA with "Book a founder walkthrough"
- [ ] Update hero dashboard mock names to generic placeholders
- [ ] Add availability disclaimer to pricing section
- [ ] Change "GDPR compliant" to "GDPR-aligned" on /security

### Next 7 days (Conversion readiness)
- [ ] Record 2-minute product overview video (Loom)
- [ ] Embed video on /tour and homepage
- [ ] Create /founder-demo booking page with Calendly
- [ ] Simplify pricing to two tiers (Founding/Growth)
- [ ] Add UTM tracking to analytics

### Next 30 days (Onboarding + positioning)
- [ ] Build production QBO/Xero credential swap flow
- [ ] Enable Stripe production keys
- [ ] Create industry landing pages (5 industries)
- [ ] Launch ROI calculator
- [ ] Publish competitor comparison pages

### Next 90 days (Scalable foundations)
- [ ] Self-serve onboarding wizard
- [ ] Public roadmap page
- [ ] Help center with onboarding guides
- [ ] Partner program for accountants
- [ ] Referral program

---

## K. Quality-Assurance Report

| Page | Element | Expected behavior | Actual behavior | Severity | Fix |
|---|---|---|---|---|---|
| /customers | Testimonials | Real customer quotes | Fake names/metrics | Critical | Remove entirely |
| / | Hero CTA | Leads to demo booking | Leads to self-serve signup | Critical | Change href/copy |
| /tour | Videos | Working product videos | Empty placeholders with internal notes | High | Replace with booking CTA |
| /pricing | Plans | Clear differentiation | Three tiers create paralysis | Medium | Collapse to two |
| /security | Compliance claims | Accurate legal status | "GDPR compliant" unverified | Medium | Downgrade language |
| / | Dashboard mock | Generic demo data | Uses same fake names as testimonials | Medium | Rename companies |
| Nav | Links | Only essential pages | Blog/Changelog/Compare clutter | Low | Move to footer |
| Mobile | CTA buttons | 44px min tap target | Some buttons smaller | Low | Increase padding |

---

## L. Final Scores

| Category | Score | Explanation |
|---|---|---|
| Messaging | 72/100 | Strong honest tone, but hero CTA misaligned with product readiness |
| Trust | 45/100 | Fake testimonials destroy credibility; founder section helps but not enough |
| Product clarity | 68/100 | Features well-described, but live vs. test status buried in some places |
| Demo readiness | 35/100 | No real videos; interactive AI demo is good but not enough |
| LinkedIn conversion readiness | 52/100 | Homepage answers basic questions, but CTA journey not optimized for warm leads |
| Mobile usability | 78/100 | Responsive design works; minor tap-target issues |
| Technical quality | 82/100 | Clean codebase, good component structure, build passes |
| **Overall readiness for first 10 customers** | **58/100** | **Not ready for LinkedIn outreach until critical trust fixes land** |

---

## M. Immediate Action Items (Next 24 Hours)

1. **Delete fake testimonials** — Edit `src/app/customers/page.tsx`, remove STORIES array
2. **Change hero CTA** — Edit `src/app/page.tsx`, replace "Start free 14-day trial" with "Book a founder walkthrough"
3. **Update dashboard mock names** — Edit HeroDashboardMock, replace "Brightline Legal" etc. with generic names
4. **Add disclaimer to pricing** — Edit pricing section, add "Some features require production credentials"
5. **Record one video** — Use Loom, 2-minute walkthrough of dashboard + AI demo
6. **Deploy fixes** — Run `vercel deploy --prod`

After these six items, the site scores ~70/100 and is ready for cautious LinkedIn outreach to 5–10 warm prospects.
