# Marketplace Growth Research: QBO App Store & Xero App Marketplace

**Date:** September 6, 2026
**Purpose:** Evaluate QuickBooks Online App Store and Xero App Marketplace as growth channels for an AR/dunning automation SaaS (Collectly)

---

## 1. QuickBooks Online (QBO) App Store

### Overview
- **URL:** https://quickbooks.intuit.com/app/apps/home/
- **Ecosystem size:** QuickBooks Online has millions of subscribers globally. quickbooks.intuit.com receives ~83.4M monthly visitors (Similarweb data).
- **App Store categories relevant to AR:** Invoicing & Payments, Lending & Banking, Business Insights
- **Discovery surfaces:** (1) Official QuickBooks App Store website, (2) "Apps" tab inside QBO product, (3) QuickBooks Online Accountant (if SSO implemented)
- **Regions with official App Store:** US, UK, CA, IN, AU (plus other countries discoverable via QBO Apps tab)

### Listing Requirements
1. **Register** on Intuit Developer Portal (developer.intuit.com)
2. **Build app** with OAuth 2.0 authentication
3. **Three-part review process:**
   - **Technical Review** (~3 business days): OAuth implementation, API usage, error handling
   - **Security Review** (~7 business days): Data security, privacy compliance, vulnerability assessment — this is typically the longest phase
   - **Marketing Review** (~5 business days): Name/logo guidelines, listing quality, SEM guidelines
4. **Production credentials:** Must have production Client ID and Client Secret
5. **Test environment:** Must provide test credentials for review team
6. **Annual review:** All listed apps go through annual review on publication anniversary

### Realistic Timeline
- Official review phases total ~15 business days, but real-world timeline is **6 weeks to 6+ months**
- Security review is the bottleneck; resubmissions add weeks
- Budget 2-3 months minimum from submission to listing

### Costs & Fees
- **No listing fee** — free to publish on the QuickBooks App Store
- **No revenue share/commission** on app sales (unlike Apple/Google's 15-30%)
- Intuit App Partner Program available for partners in US, UK, Australia, Canada (excluding Quebec)
- Optional: Intuit Single Sign-on (SSO) for QBO Accountant distribution (not required, but expands reach to accountant channel)
- **Hidden costs:** Development effort to meet security requirements, ongoing compliance maintenance, annual review preparation

### Discovery & Traffic Data
- Intuit does not publicly share App Store traffic statistics
- A developer forum question asking for traffic data went unanswered, suggesting Intuit keeps this opaque
- quickbooks.intuit.com overall gets ~83.4M monthly visits (US rank ~108)
- The App Store is a subdirectory at /app/apps/ — traffic to the app store specifically is a fraction of total QBO traffic
- **Key insight:** The "Apps" tab inside QBO product is arguably more important than the web App Store — users discover apps while already in their accounting workflow
- QBO App Store shows badges: "Accountant favorite", "Time saver", "Users' choice", "Fast growth" — these help discovery
- Featured/sponsored apps get placement on the homepage

### AR-Specific Apps on QBO App Store

#### Chaser
- **Rating:** 4.9/5 (40 ratings)
- **Categories:** Lending & Banking, Project Management, Invoicing & Payments
- **Industries:** Other Services, Professional Services
- **Positioning:** "Save time on receivables, forecast, improve visibility, and grow with confidence"
- **Key features:** Multi-channel reminders (email, SMS, letters, automated calls), AI-drafted personalized emails, AR forecasting, payment portals, CRM logging
- **Pricing:** From £199/month (~$259/month) — tiers: Compact, Core, Complete, Custom
- **Review themes:** Easy QBO sync, time savings, good account management, strong accountant channel adoption

#### BILL (formerly Bill.com)
- **Rating:** 3.9/5 (1,038 ratings)
- **Categories:** AP & AR automation
- **Positioning:** "AP & AR made easy: automate, sync, and close books faster with QuickBooks Online"
- **Badges:** Accountant favorite, Time saver
- **Much larger review base** — indicates broader market presence and longer listing history

#### Fundbox
- **Rating:** 3.9/5 (1,988 ratings)
- **Categories:** Lending & Banking
- **Positioning:** "Get access to credit to fund your company's future" — this is a **lending/credit product**, not pure AR automation
- **Pricing:** Starting at 4.66% of invoice value for 12-week terms, 8.99% for 24-week terms
- **Note:** Fundbox is invoice financing, not dunning/collections. Different category but appears in AR-adjacent searches

#### Biller Genie
- Listed as a "Similar app" to Chaser — AR automation for QBO
- Appears in the Invoicing & Payments category

### Key Observations — QBO App Store
- AR automation is a **relatively thin category** on QBO App Store — Chaser has only 40 ratings, suggesting limited penetration
- BILL dominates the AP/AR badge space with 1,038 reviews but has a mediocre 3.9 rating (common complaint: complexity and cost)
- Fundbox has high review count (1,988) but is a lending product, not collections
- **Gap opportunity:** No dominant, highly-rated pure AR dunning automation app with strong reviews exists on QBO
- The "Lending & Banking" category is crowded with financing apps; "Invoicing & Payments" is more relevant for dunning
- Accountant channel (QBO Accountant) is critical — accountants recommend apps to clients. Implementing SSO is worth the effort

---

## 2. Xero App Marketplace

### Overview
- **URL:** https://apps.xero.com/
- **Ecosystem size:** Xero has 4M+ subscribers globally, NZ$1.7B revenue (~$2.1B USD), 1,000+ integrated apps
- **Strongest markets:** UK, Australia, New Zealand; growing in US
- **App Store categories relevant to AR:** "Debtor management", "Payments", "Invoicing and jobs"
- **Discovery surfaces:** (1) Xero App Store website, (2) In-product "App Store" tab inside Xero, (3) Xerocon conference exposure, (4) Xero App Awards

### Listing Requirements (Certification Process)
1. **Register app** at developer.xero.com
2. **Build and test** against Xero sandbox
3. **Complete certification checklist** — 30 total checkpoints, **9 required**:
   - Sign Up with Xero (OAuth flow for account creation)
   - Connection management (connect, disconnect, status display, error handling)
   - Plus 7 more covering OAuth, scopes, tenant handling, etc.
4. **10 active customer connections required** — must have 10 real end-users with active Xero connections before certification (not test accounts)
5. **Submit for review** via Xero Developer Portal
6. **Developer Evangelist** reviews submission, tests OAuth flow, checks UX, evaluates edge cases
7. **App Store listing** goes live after approval

### Realistic Timeline
- **4-8 weeks** from submission to listing (after the 10-customer requirement is met)
- Xero's review is described as more thorough than most OAuth app review processes
- Building the integration + getting 10 customers + passing review = **3-6 months total** from start to listing

### Costs & Fees (MAJOR CHANGE — March 2026)

**OLD MODEL (pre-March 2026):**
- 15% revenue share on App Store subscriptions
- Free API access

**NEW MODEL (effective March 2, 2026):**
Xero retired the revenue-share model and introduced **tiered usage-based pricing**:

| Tier | Monthly Fee | Max Connections | Egress GBs/month |
|------|------------|-----------------|-----------------|
| Starter | **$0** | 5 | n/a |
| Core | **$35 AUD** (~$23 USD) | 50 | 10 GB |
| Plus | **$245 AUD** (~$160 USD) | 1,000 | 50 GB |
| Advanced | **$1,445 AUD** (~$950 USD) | 10,000 | 250 GB |
| Enterprise | POA | No limit | Volume-based |

- **Overage:** $2.40 AUD (~$1.50 USD) per excess GB
- **Ingress:** Unlimited (free to write data to Xero)
- Payments via credit card; billing cycle is monthly
- **Starter tier is free** with 5 connections — accessible for early-stage apps
- **Exemptions:** Bespoke integrations for accountants, custom connections, financial services apps, data conversion tools, and franchise apps are exempt

**Developer sentiment:** The change has been controversial. Multiple developers publicly stated:
- "This would have completely killed our ambition to integrate with Xero" — Jacques Malan, Xama Technologies
- "This would become our second-highest annual cost" — RecHound founder
- "These developers have been enticed by free API access, only to have the rug pulled" — industry commentator
- Concerns that smaller/niche apps will become unfeasible

**Impact on solo-founder AR SaaS:** The Starter tier (free, 5 connections) is sufficient for initial development and first few customers. At 50+ customers, the Core tier at ~$23/month is manageable. The real cost risk is data egress — AR automation requires reading invoice/contact data from Xero, which generates egress. Need to optimize API calls to stay within allotments.

### Additional Xero Requirements
- **Sign Up with Xero flow** required — "Get this App" button in App Store triggers OAuth flow
- **Sign In with Xero** recommended (not required) — Xero as identity provider
- **Support documentation** — publicly accessible docs required
- **AI restriction:** As of December 2025, Xero's terms **prohibit using API data to train AI/ML models**. Must keep Xero-sourced data separate from any training pipelines.
- **Webhooks** require certification — only available to certified/listed apps

### AR-Specific Apps on Xero App Marketplace

#### Chaser (Xero)
- **Rating:** 4.98/5 (374 reviews) — **significantly more reviews than on QBO** (40 ratings)
- **Function:** Debtor management
- **Awards:** Xero App Partner of the Year 2023; Xero Global Small Business App of the Year (2025)
- **Listed since:** ~2014-2015
- **Positioning:** "Automate receivables. Forecast cash flow. Grow with confidence."
- **10,000+ users worldwide**
- **Integration:** Two-way sync, hourly and on-demand, of invoices and payments
- **Key insight:** Chaser is clearly **Xero-first** — 374 reviews on Xero vs 40 on QBO. Their entire product strategy is built around the Xero ecosystem.

#### Satago (Xero)
- **Rating:** 4.93/5 (92 reviews)
- **Function:** Debtor management
- **Listed since:** February 2014 (12 years)
- **Countries:** Australia, Canada, Global, Hong Kong, Indonesia, Malaysia, New Zealand, Philippines, Singapore, South Africa, UK, US
- **Positioning:** "All-in-one cash management tool — get paid faster, protect your business, cover cash gaps"
- **Three pillars:** (1) Automated credit control / payment reminders, (2) Risk insights / credit reports, (3) Invoice finance
- **Review themes:** "Saves time", "seamless Xero link", "definite improvement in on-time payments"
- **Differentiator:** Combines AR automation with credit risk insight and invoice financing

#### Paidnice (Xero)
- **Rating:** 5.0/5 (82-83 reviews)
- **Function:** Debtor management, Invoicing and jobs
- **Positioning:** "#1 AR automation for Xero. Automate late fees, interest, reminders from your domain, statements, payment plans & collections"
- **Awards:** 2025 Xero Global Small Business App of the Year; 2026 NZ Small Business App of the Year
- **Key differentiator:** Late fees and interest automation, reminders from client's own domain
- **Fast setup:** "Live in 15 min"

#### CreditorWatch Collect (Xero)
- **Rating:** 4.89/5 (91 reviews)
- **Function:** Debtor management, Payments
- **Positioning:** "Scalable accounts receivable collections software and outsourcing services"

#### ezyCollect (Xero)
- **Rating:** 4.94/5 (35 reviews)
- **Function:** Debtor management, Payments
- **Positioning:** "AR automation platform by Sidetrade — automate reminders via email, SMS and calls, plus payment write-backs, reconciliations, statements, credit checks"
- **Note:** Sidetrade acquisition — enterprise-grade AR platform moving downstream

#### Upflow (Xero)
- **Rating:** 5.0/5 (1 review)
- **Function:** Debtor management, Payments
- **Positioning:** "Collect customer payments effortlessly. Rich cashflow analytics, powerful cash collection workflows"

#### Kolleno (Xero)
- **Rating:** 5.0/5 (18 reviews)
- **Function:** Debtor management, Payments
- **Positioning:** "Global B2B accounts receivables management and credit collections platform"

#### Statey (Xero)
- **Rating:** 4.6/5 (10 reviews)
- **Function:** Accountant tools, Debtor management
- **Positioning:** Automated customer statements (weekly/monthly) with 30/60/90-day age analysis

### Key Observations — Xero App Marketplace
- **AR/debtor management is a well-populated category** on Xero — at least 8 dedicated AR apps listed
- **Chaser dominates** with 374 reviews and App Partner of the Year awards
- **Paidnice is the rising star** — 5.0 rating, 82+ reviews, award-winning, focused on late fee automation
- **Satago has deep history** (12 years listed) but is more of a cash management tool (credit + risk + finance) than pure dunning
- The "Debtor management" function category is the primary discovery surface — being listed here is essential
- Xero's ecosystem is more mature for AR automation than QBO's — more competitors, more reviews, more user awareness
- **Xerocon conference** and **Xero App Awards** are significant visibility boosters — Paidnice and Chaser both benefited from award exposure

---

## 3. Competitor Presence Comparison

| Competitor | QBO App Store | Xero App Store | Primary Platform |
|-----------|--------------|----------------|-----------------|
| **Chaser** | 4.9/5 (40 ratings) | 4.98/5 (374 reviews) | **Xero** (clearly) |
| **Satago** | Not found on QBO | 4.93/5 (92 reviews) | **Xero** only |
| **Fundbox** | 3.9/5 (1,988 ratings) | Not found | **QBO** (lending, not pure AR) |
| **Versapay** | Not found in search | Not found in search | Neither marketplace |
| **Growfin** | Not found in search | Not found in search | Neither marketplace |
| **BILL** | 3.9/5 (1,038 ratings) | Not searched | **QBO** (AP+AR combined) |
| **Paidnice** | Not found | 5.0/5 (82 reviews) | **Xero** only |
| **ezyCollect** | Not found | 4.94/5 (35 reviews) | **Xero** only |
| **Kolleno** | Not found | 5.0/5 (18 reviews) | **Xero** only |
| **Biller Genie** | Listed (QBO) | Not found | **QBO** |

**Key finding:** Most AR automation specialists (Chaser, Satago, Paidnice, ezyCollect, Kolleno) are **Xero-only or Xero-first**. QBO's AR category is thinner but dominated by BILL (AP+AR combo) and Fundbox (lending). Versapay and Growfin appear to target enterprise/mid-market and are not on either marketplace.

---

## 4. Strategic Analysis: Which Marketplace First?

### Recommendation: **Start with Xero, then expand to QBO**

#### Reasons to prioritize Xero first:

1. **AR category maturity:** Xero has a well-established "Debtor management" category with active user browsing. Users already look for AR apps there. QBO's AR category is thinner — users may not actively search for dunning tools.

2. **Lower review friction (despite new API fees):** Xero's certification is well-documented with a clear 9-checkpoint process. QBO's security review is opaque and can take months. Xero's 4-8 week review (after 10 customers) is more predictable.

3. **Competitor validation:** The presence of 8+ AR apps on Xero validates market demand. Chaser's 374 reviews prove users browse and adopt AR apps from the Xero marketplace.

4. **Starter tier is free:** Xero's new pricing model starts at $0 for 5 connections — no cost to begin. QBO is also free to list, but the development effort for QBO's security review is higher.

5. **Xerocon + App Awards:** Xero's ecosystem events (Xerocon, App Awards) provide additional visibility channels that QBO doesn't offer at the same scale. Winning or being nominated for an award drives significant inbound.

6. **Accountant channel:** Xero's accountant partner program is strong, especially in UK/AU/NZ. Accountants are the primary referrers of AR tools.

7. **Geographic alignment:** Xero is dominant in UK, AU, NZ — markets where late payment culture is a recognized problem (UK Late Payment Act, etc.). These are strong AR automation markets.

#### Reasons to also pursue QBO (as second priority):

1. **Larger user base:** QBO has more US subscribers than Xero. US market is bigger overall.
2. **Thinner competition:** Only Chaser (40 ratings) and Biller Genie are pure AR plays on QBO. Less competition = more opportunity to stand out.
3. **No revenue share:** QBO takes 0% commission (Xero's new model charges API fees that can exceed the old 15% share for data-heavy apps).
4. **QBO Accountant channel:** Implementing Intuit SSO gives access to QBO Accountant, where accountants recommend apps to clients.
5. **Fundbox/BILL gap:** BILL's 3.9 rating leaves room for a better-rated pure AR automation tool.

#### Expected Inbound Lead Flow: Marketplace vs Cold Email

**Marketplace inbound (realistic estimates for a new listing):**
- **Xero:** Based on competitor review velocity (Chaser: 374 reviews over ~10 years = ~37/year; Paidnice: 82 reviews over ~2 years = ~41/year), a well-positioned new app might get **5-20 organic signups/month** in the first year, growing as reviews accumulate
- **QBO:** Given Chaser's 40 ratings over similar period, expect **2-10 organic signups/month** — the category gets less browse traffic
- **Important caveat:** These are organic discovery numbers. Apps that win awards, get featured, or actively market their listing get 3-5x more.
- **Conversion:** Marketplace leads are high-intent — they're already in their accounting platform looking for a solution. Conversion rates likely 15-30% vs 1-3% for cold email.

**Cold email comparison:**
- A solo founder sending 50-100 cold emails/week might get 1-3 demos/week (2-6% reply rate, ~30% demo conversion from replies)
- Cold email volume: ~200-400/month → ~4-12 demos/month
- Marketplace: ~5-20 signups/month with higher intent and lower CAC

**Strategic recommendation:** Marketplace listings are **complementary, not replacement** for cold email. The marketplace provides:
- Inbound leads at near-zero CAC (after listing cost)
- Credibility/trust signal for cold email prospects ("As seen on QBO/Xero App Store")
- Accountant referral channel (accountants browse marketplaces to recommend tools)
- SEO benefit (App Store listings rank well in Google)

**Optimal sequence:**
1. Build Xero integration first (simpler API, clearer certification path)
2. Get 10 paying customers via direct sales/cold email
3. Get Xero certified and listed (4-8 weeks)
4. Build QBO integration in parallel
5. Submit to QBO App Store (budget 2-3 months for review)
6. While QBO review is pending, leverage Xero listing for credibility
7. Pursue QBO Accountant SSO for accountant channel access

---

## 5. Cost & Barrier Summary

| Factor | QBO App Store | Xero App Marketplace |
|--------|--------------|---------------------|
| **Listing fee** | Free | Free |
| **Revenue share** | 0% | 0% (new model; was 15%, retired Mar 2026) |
| **API costs** | Free (no API fees) | Tiered: $0-$950+/month based on connections & data egress |
| **Review time** | 6 weeks - 6+ months (realistic) | 4-8 weeks (after 10 customers) |
| **Pre-listing requirement** | Production app + OAuth 2.0 + security review | 10 active customer connections + 9 certification checkpoints |
| **Annual review** | Yes (on anniversary) | Ongoing compliance expected |
| **OAuth requirement** | OAuth 2.0 (Intuit) | OAuth 2.0 (Xero) |
| **SSO** | Optional (for QBO Accountant) | Sign Up with Xero required; Sign In recommended |
| **AI restriction** | No specific restriction | Cannot use Xero API data to train AI/ML models |
| **Security review** | Yes (detailed, opaque) | Yes (part of certification) |
| **Marketing review** | Yes | Yes (listing quality reviewed by Developer Evangelist) |

### Biggest Barriers

**QBO:**
1. Security review is the #1 bottleneck — unpredictable, can take months
2. Must provide test environment with credentials for reviewers
3. Naming/logo guidelines are strict; marketing requirements must be met before listing
4. No clear documentation on what specifically triggers security review failures

**Xero:**
1. **10-customer requirement** — can't list without real users already connected. This is the biggest hurdle for a new app. Must do direct sales first.
2. **New API fees** — data egress costs could be significant for AR automation (reading lots of invoice/contact data). Need to optimize API calls.
3. **AI restriction** — if the product uses AI for email drafting or predictions, must ensure Xero data doesn't flow into training pipelines.
4. **Crowded AR category** — 8+ competitors means standing out requires strong positioning, reviews, and ideally an award nomination.

---

## 6. Action Items for Collectly

### Immediate (Weeks 1-4)
- [ ] Register on Xero Developer Portal (developer.xero.com) — free
- [ ] Register on Intuit Developer Portal (developer.intuit.com) — free
- [ ] Build Xero OAuth 2.0 integration (Sign Up with Xero flow)
- [ ] Start with Xero Starter tier (free, 5 connections)
- [ ] Recruit first 10 Xero customers via direct sales/cold email

### Short-term (Months 2-3)
- [ ] Complete Xero certification checklist (9 required checkpoints)
- [ ] Prepare Xero App Store listing (description, screenshots, pricing, video demo)
- [ ] Begin QBO OAuth 2.0 integration development in parallel
- [ ] Optimize API egress to minimize future Xero API costs

### Medium-term (Months 3-6)
- [ ] Submit Xero App Store listing (after 10 customers connected)
- [ ] Build QBO integration to production quality
- [ ] Prepare QBO App Store listing materials
- [ ] Submit QBO App Store for review (budget 2-3 months)
- [ ] Implement Intuit SSO for QBO Accountant channel

### Ongoing
- [ ] Solicit reviews from happy customers on both marketplaces
- [ ] Apply for Xero App Awards (annual)
- [ ] Attend Xerocon if possible (UK/AU/US events)
- [ ] Monitor Xero API egress usage and optimize
- [ ] Track marketplace inbound leads separately from cold email pipeline

---

## 7. Key Links

- **QBO App Store:** https://quickbooks.intuit.com/app/apps/home/
- **QBO Developer Portal:** https://developer.intuit.com
- **QBO Listing Docs:** https://developer.intuit.com/app/developer/qbo/docs/go-live/list-on-the-app-store
- **Xero App Store:** https://apps.xero.com/
- **Xero Developer Portal:** https://developer.xero.com
- **Xero Listing Docs:** https://developer.xero.com/documentation/xero-app-store/app-partner-guides/app-listing/
- **Xero Pricing:** https://developer.xero.com/pricing
- **Xero Certification Guide:** https://remittancego.com/resources/developers/getting-listed-on-xero-app-store
- **Chaser on QBO:** https://quickbooks.intuit.com/app/apps/appdetails/chaser/
- **Chaser on Xero:** https://apps.xero.com/us/app/chaser
- **Satago on Xero:** https://apps.xero.com/us/app/satago
- **Xero AR Collection:** https://apps.xero.com/us/collection/accounts-receivable-software

---

*Research compiled from web searches of official Intuit/Xero developer documentation, App Store listings, third-party developer guides, and industry reporting. Data accurate as of September 2026.*