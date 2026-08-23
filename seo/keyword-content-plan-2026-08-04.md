# Collectly — SEO Keyword & Content Plan

**Date:** 2026-08-04
**Author:** Subagent (SEO market research)
**Site:** https://getcollectly.app
**Inputs audited:** Repo at `/home/user/.openclaw/workspace/collectly`, live sitemap (`/sitemap.xml`), live title/metadata on `https://getcollectly.app/vs-chaser` and `https://getcollectly.app/vs-quickbooks`, plus 8 web-search clusters (Xero/QuickBooks invoice chasing, Chaser alternatives, AI dunning, AR automation small agency, free invoice reminder templates, DSO, promise-to-pay, cash-flow forecasting).

> **Important up-front callout.** The original brief described 16 `/vs-*` pages, 9 `/for/*` pages, and 2 free tools. The actual shipped site is smaller:
> **9 `/vs-*` pages** (bill, chaser, melio, quickbooks, freshbooks, gaviti, growfin, highradius, zohobooks), **3 `/for/*` pages** (agencies, consultancies, uk-agencies), **4 `/tools/*` pages** (dispute-email-template, dso-calculator, ar-cost-calculator, ar-roi), **2 dedicated lead-magnet tools** (`/ar-audit`, `/ar-roi`), and **7 blog posts**.
> That gap itself is the single biggest organic-real-estate opportunity Collectly has right now — see Section 5.

---

## Section 1 — High-Intent Keyword Clusters

Volume estimates below are **informed estimates** (no live GSC/keyword-tool access). They use the SERP composition I observed (Xero App Store has 4.98★ across 374 reviews for Chaser, 81 reviews for Paidnice; multiple dedicated roundup posts; competitor pages with deep content). Treat them as directional bands, not exact figures.

| # | Cluster (representative terms) | Estimated monthly volume band (US/UK/AU/CA) | Intent | Current Collectly coverage | Gap | Recommended action |
|---|--------------------------------|----------------------------------------------|--------|----------------------------|-----|--------------------|
| 1 | **"Xero invoice reminder"**, "Xero payment reminders", "Xero AR app", "Xero invoice chasing app" | 4k–8k combined (US/UK/AU/CA). "Xero invoice reminder" alone returns Paidnice + Chaser + Xero Central + Tradify in the top 5 — all with dedicated landing pages. | Mixed — top terms are **commercial/transactional** (buyers evaluating add-ons); informational ("how to set up") sits underneath. | ❌ None. No dedicated `/xero-invoice-reminder` page; no `/integrations/xero` either. The home and `/vs-quickbooks` page mention "Xero" but never own the exact keyword. | High — Cluster 1 is the single largest unforced commercial-intent keyword family Collectly can compete for. None of the vs-* pages target "Xero" head-on. | **Build `/integrations/xero` and `/tools/invoice-reminder-for-xero`** as dedicated, indexable landing pages. Embed a five-step "set up Xero reminders" walkthrough, the nine Xero reminder limits (capped at 5, no SMS, etc.), and the FAQPage schema. Link them from `/pricing` and `/features`. |
| 2 | **"QuickBooks invoice chasing"**, "QuickBooks AR automation", "QuickBooks overdue reminders", "QBO payment reminders" | 3k–6k combined (US/AU/CA dominant; UK smaller). Top SERP currently: QuickBooks UK docs, Coefficient, Satva, "recoverinvoice.com" — none of them QB-native SMB AR tools. | **Commercial** dominant; **informational** at the long-tail. | ⚠️ Partial — `/vs-quickbooks` exists and has good metadata (Collectly vs QuickBooks — smarter AR automation for QBO users) but it's a *comparison* page, not a *category* page. No `/integrations/quickbooks`, no "QuickBooks overdue reminders" play. | Medium-high — Collectly is in beta on QB. The comparison page works for "vs" queries but won't rank for plain "QuickBooks invoice chasing" because it doesn't target that phrase. | **Add `/integrations/quickbooks` (or `/for/quickbooks-users`)** as a category page that ranks for "QuickBooks invoice chasing" head terms. Mark QB as beta honestly; invite founding customers. Reuse the comparison-table component. |
| 3 | **"Chaser alternative"**, "Chaser vs Collectly", "Chaser free alternative", "Chaser vs Xero", "Chaser vs QuickBooks" | 1.5k–3k combined. Chaser just raised entry to £199/mo (June 2026 data), so "alternative" intent has spiked. Top SERP: sourceforge.net Chaser alternatives list, topbusinesssoftware.com, Chaser's own blog comparing itself to HighRadius. | Pure **commercial/transactional** — these are buyers in the decision stage. | ✅ Strong — `/vs-chaser` exists with a 151-line page that compares on Price/Setup/AI/Best-for, references StructuredBreadcrumbs, and is in the sitemap at priority 0.9. ✅ `/compare` hub exists. | Low-medium — single page lacks FAQPage schema, lacks quote/testimonial blocks, lacks "Alternatives to Chaser" subsection that could capture the long-tail (`"Chaser alternative for Xero"`, `"Chaser free"`). | **Upgrade `/vs-chaser`**: add FAQPage JSON-LD (5-6 Qs), add a "Chaser alternatives for [Xero / QuickBooks / small agencies / UK]" sub-section, add 1-2 short customer quotes once available. Mirror the upgrade on `/vs-melio` and `/vs-bill` (which compete in the same intent bucket). |
| 4 | **"Accounts receivable automation"**, "AR automation for small business", "automate accounts receivable", "automated AR" | 5k–10k combined (very competitive SERP; HighRadius, Upflow, Emagia, Maxyfi, DigitalStaff all competing). | **Informational** at the head term; **commercial** at "for small business / for agencies" modifiers. | ⚠️ Partial — home H1 targets this ("Stop chasing late invoices — AR automation for small agencies") and homepage has FAQPage JSON-LD. But there's **no dedicated `/ar-automation` or `/accounts-receivable-automation` category page**. The single big pillar post `ar-automation-for-small-business-2026` exists. | High — you need a pillar page that owns the head term and links to the playbooks and tools. | **Build `/ar-automation`** as a 2,500-word pillar ("Accounts receivable automation for small businesses in 2026") targeting the head term, with sub-sections for agency/bookkeeper/Xero/QuickBooks. Internal links to `/ar-audit`, `/ar-roi`, `/blog/ar-automation-for-small-business-2026`, and `/pricing`. FAQPage schema. This is the single biggest long-term traffic investment. |
| 5 | **"AI dunning"**, "AI dunning software", "AI invoice reminders", "automated dunning for small business" | 1k–2.5k. Growing fast — Alguna, Paraglide, AccountsReceivable.ai, Stripe Billing all publishing on this in 2026. | **Informational / commercial investigation.** | ⚠️ Partial — `/blog/ar-automation-for-small-business-2026` mentions AI dunning; `/features` page describes "tone-aware AI reminders"; homepage FAQ has "tone-aware AI". No `/ai-dunning` or `/features/ai-dunning` page. | Medium — quick win if you publish a category page now, before the SERP consolidates around 2-3 big incumbents. | **Add `/features/ai-dunning`** (or `/ai-invoice-reminders`): "What tone-aware AI dunning actually does, who it's for, and how it compares to templated sequences." FAQPage schema. Mirror with a blog post: "Tone-aware AI for invoice reminders: a 2026 field guide." |
| 6 | **"Agency AR tool"**, "AR automation for agencies", "invoice chasing for marketing agencies", "consultancy invoice follow up", "bookkeeper AR automation" | 1.5k–3k. Very strong for Collectly's ICP — explicit agency/modifier variants return thinner SERPs (mostly agencyhandy.com, clientplug.io, wayfront.com). | **Commercial** with strong modifier intent — these are the ICP's own words. | ⚠️ Partial — `/for/agencies`, `/for/consultancies`, and `/for/uk-agencies` exist. But I count only **3** `/for/*` pages; the brief said 9. Missing: UK consultancies, AU agencies, CA agencies, bookkeepers/bookkeeping firms, digital marketing agencies, creative agencies. | High — missing pages that aren't expensive to produce and that own the modifier terms. | **Build out `/for/*` to 9 pages**: existing 3 plus `/for/bookkeepers`, `/for/digital-marketing-agencies`, `/for/creative-agencies`, `/for/au-agencies`, `/for/ca-agencies`, `/for/uk-consultancies`. Each page should be 600-1,000 words, with a specific ICP-shaped headline ("Invoice chasing software for digital marketing agencies on Xero"), a tool embed (DSO calculator), and a customer quote slot. |
| 7 | **"Free invoice reminder template"**, "free payment reminder template", "overdue invoice reminder email", "invoice reminder email template Word/Docs" | 8k–15k combined (the biggest informational cluster). HubSpot, invoicefly.com, paymentreminderemails.com, invoicifyai.com all rank with template libraries + free downloads. | **Informational** dominant. Some commercial-intent spillover ("free invoice reminder software"). | ⚠️ Partial — `/tools/dispute-email-template` exists (good — it targets "dispute email template" precisely). No general "free invoice reminder template" library. No `/blog/best-dunning-templates-2026` page is in the sitemap… wait, **yes it is** (`/blog/best-dunning-templates-2026`). | Medium — you've started this correctly; the existing `/blog/best-dunning-templates-2026` and `/tools/dispute-email-template` together cover the cluster, but they're isolated. | **Bundle them**: add a `/templates` or `/blog/invoice-reminder-template-library` index that links from `/blog/best-dunning-templates-2026` to a copy-paste library of 6-8 templates (pre-due, due-today, 1-3 days, 7 days, 14 days, 30 days, dispute, final-notice). One per stage, copy-pasteable. This is a top-of-funnel magnet; back-link magnet. |
| 8 | **"DSO calculator"**, "days sales outstanding formula", "DSO benchmark by industry", "DSO for agencies" | 6k–10k combined. Upflow, Wall Street Prep, Metric Rig, Calc Mastery, Corporate Finance Institute all rank at the top with guide + calculator combos. | **Informational** dominant; some B2B SaaS buyers land here. | ✅ Strong — `/tools/dso-calculator` exists and is in the sitemap at priority 0.7. Also `/blog/cut-dso-5-step-playbook-2026` exists. The DSO calculator is the single best off-page linkable asset on the site. | Low-medium — the asset exists; the gap is **backlinks, internal linking, and an "industry benchmark" data layer**. | **Upgrade the DSO calculator**: add an "agency benchmark" tile (industry-median DSO for 5-30 person agencies/consultancies — estimate based on QuickBooks 2025 data showing $17.5k average per business). Add an "email me my DSO + 5 ways to cut it" lead-capture. Build backlinks from a couple of agency-tool listicles. |
| 9 | **"Promise to pay tracking"**, "promise to pay template", "promised payment date tracking" | 400–1,200. Niche but very high commercial intent — every buyer evaluating Chaser/Upflow/Kolleno/Collectly types this. | Pure **commercial investigation.** | ❌ No dedicated page. The term appears in `/features` and on the homepage but there's no `/features/promise-to-pay` or blog pillar. | High — small volume but extremely high intent. Cheap to publish; will rank behind the big three on volume but can rank for the *modifier* queries ("promise to pay tracking for Xero", etc.). | **Build `/features/promise-to-pay`** ("Promise-to-pay tracking for small businesses — what it is, how to do it in 2 minutes"). FAQPage. Mirror with `/blog/promise-to-pay-tracking-template` (free template + workflow). |
| 10 | **"Cash flow forecast for agencies"**, "cash flow forecast template consulting", "agency cash flow forecast 13-week" | 2k–5k combined. Financialaha, Juntrax, Project Manager, Flevy, Business Victoria all in the SERP. | **Informational** with a B2B side-intent for SaaS that does the forecasting. | ⚠️ Partial — `/blog/cash-flow-forecasting-small-business` is in the sitemap. No dedicated `/tools/cash-flow-forecast` interactive tool. The blog post is fine but doesn't own the head term. | Medium — competitive SERP but weak content on the "agency-specific" angle. | **Add a 13-week agency cash-flow template tool at `/tools/cash-flow-forecast`** (interactive — same shell as the DSO calculator). Plus a blog post "13-week cash flow forecast for agencies: the spreadsheet we use and the one you should use instead." Cross-link from `/features` (which already mentions "4-week forecast"). |
| 11 | **"Best AR software for agencies"**, "best invoicing software for agencies", "best accounts receivable software small business" | 2k–4k. "Best X" SERPs are dominated by Software Advice, G2, Capterra, plus a few hand-curated roundups. | Pure **commercial investigation/transactional.** | ⚠️ Partial — `ComparisonTable` component on `/compare` covers 6 competitors. But there's no "best AR software for agencies" listicle on Collectly's own domain. Chaser and Paidnice both publish listicles ranking themselves. | High — listicles ranking roundup posts are the highest-converting commercial-intent assets in this space, and nobody owns "best AR for agencies" yet. | **Publish `/blog/best-ar-software-for-agencies-2026`** as a real listicle with methodology, scoring, and links to each `/vs-*` page. Honest, not a marketing list — Chaser, Paidnice, Upflow, Gaviti, Growfin, Collectly, ALL included. This becomes the hub page that the 9 `/vs-*` pages all link into. |

> **Why the cluster ranking matters.** Clusters 1, 4, 6, 7, 8, 11 are where the missing pages live. Clusters 3 and 9 are where an upgrade to existing pages is cheap and high-leverage. Cluster 5 and 10 are pre-emptible: SERPs are still soft, getting in now is cheap.

---

## Section 2 — 3 Quick-Win Long-Tail Opportunities (rank #1-3 within 30 days)

These are realistic wins because (a) the keyword has clear commercial/transactional intent, (b) the SERP today is dominated by either thin content or directory/aggregator pages with low topical authority, and (c) Collectly has an existing angle that none of the top results cover.

### Win 1 — `/vs-paidnice` (NEW PAGE)
- **Target query:** "Paidnice alternative", "Collectly vs Paidnice", "Paidnice for Xero"
- **Why it's winnable:** Paidnice is the strongest Xero-native SMB AR tool right now (5.0★ across 81 Xero App Store reviews, dominates `accounting.events`'s listicle). But **Collectly has no `/vs-paidnice` page** — and Paidnice has only one organic competitor-comparison page (their own listicle). A neutral, well-structured comparison targeting "Paidnice alternative" + "Paidnice for Xero" + "Paidnice vs Chaser" would rank.
- **Intent:** Commercial investigation.
- **Estimated difficulty:** Low (KD ~10-15). Target keyword volume band: 200-600/mo.
- **Page spec:** Same shape as `/vs-chaser` (4 differentiator cards, full ComparisonTable, "Choose Paidnice if / Choose Collectly if", FAQPage JSON-LD). Emphasise: Collectly has a `/tools/dso-calculator`, has Cash-flow forecast, has Customer risk scoring, has Disputes classification, has Promise-to-pay tracking with reply pause — most of which are not in Paidnice's matrix.
- **Time to rank:** 2-4 weeks with internal links from `/blog/best-ar-software-for-agencies-2026` (Win 11 above) and from the homepage ComparisonTable.

### Win 2 — `/free-invoice-reminder-template-xero` (NEW PAGE, or blog)
- **Target query:** "free Xero invoice reminder template", "Xero overdue invoice reminder template", "invoice reminder email Xero"
- **Why it's winnable:** I checked SERPs — `smartsmssolutions.com` and `smb compass.com` dominate these terms with thin template dumps. **No Xero-OAuth-native product owns this term.** Collectly can with a real template + a 5-step "how to set it up in Xero" walkthrough + a companion `/tools/dispute-email-template` cross-link.
- **Intent:** Informational with B2B tool-conversion path.
- **Estimated difficulty:** Low (KD 5-15). Target keyword volume band: 400-1,200/mo.
- **Page spec:** 800-1,200 words, H1 "Free invoice reminder templates for Xero (copy-paste ready)", 6 templates (pre-due, due-today, 1-3 days overdue, 7 days, 14 days, 30 days+final), each with Xero-specific placeholder notation. End with: "Or let Collectly do it automatically — 14-day free trial."
- **Time to rank:** 2-4 weeks, especially after sitemap resubmit.

### Win 3 — `/blog/agency-invoice-chasing-checklist-2026` (NEW BLOG POST)
- **Target query:** "agency invoice chasing checklist", "invoice chasing process for agencies", "agency AR checklist"
- **Why it's winnable:** Zero authoritative pages own this. The top results are thin "how to chase invoice payments" posts (Agency Handy, ClientPlug) that aren't specific to agencies. A practical checklist post that includes: DSO target, sequence template, what to log, when to escalate, which tool to use — wins.
- **Intent:** Informational / commercial investigation.
- **Estimated difficulty:** Very low (KD 0-10). Target keyword volume band: 100-400/mo.
- **Page spec:** 1,200-1,500 words, downloadable checklist PDF (gated — converts to `/ar-audit`). Link to `/for/agencies`, `/tools/dso-calculator`, `/ar-roi`, and one `/vs-*` page from the "tools" section.
- **Time to rank:** 1-2 weeks (long-tail, thin SERP, topically relevant internal links available).

> **Bonus quick-win (not in top 3).** Add `/vs-paidnice`, `/vs-upflow`, `/vs-kolleno`, `/vs-sagely-agencies`, `/vs-billtrust`, `/vs-dunivo` as six new competitor-comparison pages. Each targets a specific competitor's name + a commercial modifier. These pages have zero technical risk, follow an existing template (`/vs-chaser`), and collectively add 6-10× more "vs X" SERP real estate than the current set. **This is the single cheapest organic-traffic multiplier available.**

---

## Section 3 — 3 High-Volume Terms Worth a Longer Play (3-6 months)

These are competitive SERPs with high volume where ranking top-3 will take 3-6 months of consistent work (backlinks, depth, internal linking, topical authority). Worth a real investment because the per-page traffic is 10-100× the long-tail wins.

### Term 1 — "Accounts receivable automation" (head term, 5k-10k/mo band)
- **Plan:**
  1. Publish the `/ar-automation` pillar page (Section 1, Cluster 4).
  2. Cross-link from every `/vs-*` page, every `/for/*` page, every blog post, both lead-magnet tools, and `/features` and `/pricing`.
  3. Build 4-6 deep supporting blog posts over 90 days (e.g., "AR automation for Xero users", "AR automation vs QuickBooks native", "AR automation for bookkeepers", "AR automation in 2026 [trend piece]").
  4. Submit the pillar URL to 2-3 industry newsletters and 5-10 SaaS-listicle blogs (Software Advice, G2, GetApp, Crozdesk, Capterra — vendor profile pages count as backlinks even without the editor linking).
  5. Pursue one real backlink per week from finance or SaaS blogs.
- **Success criteria:** Top 10 by month 4, top 5 by month 6, top 3 by month 9-12.
- **Why now:** The SERP is dominated by enterprise players (HighRadius, Upflow, Emagia). None of them are SMB-priced. The angle "AR automation built for 5-30 person agencies from $49/mo" is unoccupied.

### Term 2 — "Xero invoice chasing" (3k-6k/mo band, UK/AU dominant)
- **Plan:**
  1. Publish `/integrations/xero` and `/tools/invoice-reminder-for-xero` (Section 1, Cluster 1).
  2. Publish 4 supporting blog posts over 90 days ("Xero invoice reminders: how to set them up", "Why Xero's built-in reminders aren't enough", "Xero late-payment fees: how to add them legally", "Xero invoice chasing app: a 2026 buyer's guide").
  3. Get the Xero App Store listing live (assumes this is pending). Backlink from `apps.xero.com/.../collectly` is one of the strongest single links a SaaS can get.
  4. Cross-link from `/compare`, `/pricing`, every `/vs-*` page that mentions Xero (currently `/vs-chaser`, `/vs-bill`, `/vs-melio`, `/vs-quickbooks`, `/vs-freshbooks`, `/vs-zohobooks`).
- **Success criteria:** Top 10 by month 3, top 3 by month 6.
- **Why now:** Chaser's entry price rose sharply in 2026, leaving a price-sensitive gap in the Xero AR-tools SERPs.

### Term 3 — "Best AR software for small business" (2k-4k/mo band, US/UK/AU/CA)
- **Plan:**
  1. Publish `/blog/best-ar-software-for-small-business-2026` (and a "for agencies" variant — Section 1, Cluster 11).
  2. Use this listicle to drive internal links into every `/vs-*` page (so each "Competitor X — read the comparison →" anchor passes PageRank).
  3. Make the listicle genuinely useful: methodology box, scoring rubric, "best for" tags, published-and-updated date, author byline. (Avoid the affiliate-marketing look.)
  4. Submit to a "recommended tools" page on Capterra and G2 once Collectly has 5+ reviews on each.
  5. Reddit r/smallbusiness, r/Bookkeeping, r/Accounting quarterly mentions (genuine engagement, not link drops).
- **Success criteria:** Page 1 by month 4, top 5 by month 8-10.
- **Why now:** The current top 5 on this query is Software Advice + G2 + Capterra (which are aggregators, not actual listicles) plus Upflow's own post. An authoritative, honest listicle with a 2026 stamp would compete.

> **Bonus long-term term.** "AI invoice reminders" or "AI dunning" (1k-2.5k/mo) — small but rising fast in 2026. If the `/features/ai-dunning` page is published now, by the time LLM-driven search ("best AI for invoice reminders") becomes meaningful, Collectly owns it.

---

## Section 4 — `vs-*` Page Audit (using `/vs-chaser` as the template)

**What's on `/vs-chaser` today (the model page):**
- Metadata: title, description, canonical, OG image, keywords array (`Collectly vs Chaser`, `Chaser alternative`, `Xero invoice reminder`, `Chaser vs Collectly`). ✅ Solid.
- `StructuredBreadcrumbs` JSON-LD (Home → Compare → vs Chaser). ✅
- Hero: eyebrow "Comparison", H1 "Collectly vs Chaser", lead paragraph with concrete pricing comparators, two CTAs (Start trial + See pricing). ✅
- 4 differentiation cards (Price, Setup, AI dunning, Best for). ✅ Each names the actual differentiator.
- Full `ComparisonTable` (Collectly vs Chaser vs BILL vs Melio vs QBO vs FreshBooks) on 14 feature rows. ✅
- "How Chaser built its clientele" — 4-card narrative explainer. ✅ Smart (positions Collectly).
- "When to choose which" — two cards: Choose Collectly / Choose Chaser. ✅
- Final waitlist CTA card. ✅
- Sitemap entry: priority 0.9, monthly. ✅

**What's missing (the gap to fix to climb to top 3):**

1. **No FAQPage schema.** A /vs-* page ranking top-3 on competitive SERPs almost always owns the "people also ask" box. Add `faqJsonLd()` with 5-6 Qs:
   - "Is Collectly cheaper than Chaser?"
   - "Does Collectly work with Xero and QuickBooks?"
   - "Can Collectly send SMS invoice reminders?"
   - "How long does Collectly take to set up vs Chaser?"
   - "Does Collectly handle promise-to-pay tracking like Chaser?"
   - "Who should pick Chaser over Collectly?"

2. **No customer quote / social proof block.** One short quote from a founding customer with name, role, "switched from Chaser" line, and avatar would push conversion. Add a third CTA card with the quote before the final waitlist card.

3. **No "Chaser alternatives for [Xero / QuickBooks / agencies / UK / US]" sub-section.** This is the single biggest long-tail miss on the page. A 4-6-line paragraph + 4 small internal links (`/integrations/xero`, `/for/agencies`, `/for/uk-agencies`, `/vs-paidnice`) owns those modifier searches.

4. **No mention of specific Chaser weaknesses observed in third-party copy.** Stuff like:
   - Chaser entry tier rose to £199/mo in 2026 (June 2026 data — Paidnice.com's listicle on `accounting.events`).
   - "Mid-market fit" — Chaser is positioned for £4M+ revenue, leaving £100k–£2M agencies underserved.
   - No AI reply pause / dispute classification in Chaser's core plans.
   Including these in the page (with sources linked) makes it a *better* honest comparison than Chaser's own page.

5. **No "migrating from Chaser" sub-section.** Buyers coming to /vs-chaser are often already Chaser users considering a switch. A 4-line "How to move from Chaser to Collectly in 10 minutes" block is uniquely useful and competes with nobody.

6. **No downloadable one-pager.** A 2-page PDF "Chaser → Collectly migration checklist" gated by email is the highest-converting content asset in any vs-* page; it doubles as a lead-magnet.

7. **The ComparisonTable component is shared across all /vs-* pages** — which is good for consistency but bad for differentiation. Each /vs-* page should also have a 4-row "feature-comparison" specific to that competitor (e.g., on `/vs-paidnice`, lead with "Late fees / SMS / Posted letters / QuickBooks-nativeness"). Right now the diff is in 4 cards only.

8. **OG image is `/og-vs-chaser.png` — good.** But the page itself does not declare a specific Twitter image. The metadata builder in `lib/seo.ts` does pass through, so this is fine. Worth confirming the actual image renders on Twitter and LinkedIn previews once shipped.

9. **Internal linking is thin.** The page links out to `/sign-up`, `/pricing`, `/compare`, `/vs/chaser` (via breadcrumbs only). Add links to: `/features`, `/ar-audit`, `/ar-roi`, `/tools/dso-calculator`, `/blog/cut-dso-5-step-playbook-2026`, `/blog/final-notice-that-gets-paid-2026`. Each adds 1 line of context.

10. **No `modifiedTime`** in the page metadata. Add it; Google treats freshness as a small but real ranking factor on comparison pages.

> **Apply the same audit pattern to:** `/vs-melio`, `/vs-bill`, `/vs-freshbooks`, `/vs-quickbooks`, `/vs-zohobooks`, `/vs-gaviti`, `/vs-growfin`, `/vs-highradius`. The latter three (enterprise competitors) will rank easier because their target customers don't overlap with Collectly's ICP — these pages can be short and simply position Collectly as "the SMB-priced alternative."

> **Priority of additions (ranked by expected ranking lift):**
> FAQPage schema > "Migrating from X" sub-section > "Alternatives for [modifier]" sub-section > customer quote > one-pager CTA card.

---

## Section 5 — 30-Day Content Matrix (publication priority)

Optimised for: smallest editorial lift per ranking-position gained.

| Priority | Asset | Type | Why this, why now | Effort |
|----------|-------|------|-------------------|--------|
| **1 (do Day 1-2)** | `/vs-paidnice` | New /vs-* page | Paidnice dominates the Xero AR SERP and Collectly has no comparison page; "Paidnice alternative" has clear commercial intent. | Low (clone /vs-chaser, swap diffs and copy) |
| **2 (do Day 2-3)** | Upgrade `/vs-chaser` with FAQPage schema + "Migrating from Chaser" block + "Alternatives for…" sub-section | Edit existing | Cheapest ranking lift on the highest-traffic vs-* page; FAQ schema unlocks People Also Ask box. | Low |
| **3 (do Day 4-5)** | `/free-invoice-reminder-template-xero` (or blog post with the same slug) | New page/post | Very thin SERP for "Xero invoice reminder template" + leads directly into `/vs-paidnice` and `/tools/invoice-reminder-for-xero`. | Medium |
| **4 (do Day 6-7)** | `/blog/best-ar-software-for-agencies-2026` | New blog post (listicle) | Highest-converting commercial-intent asset in the space; back-links into every /vs-* page. | Medium |
| **5 (do Day 8-10)** | `/vs-upflow` + `/vs-kolleno` | 2 new /vs-* pages | Upflow has aggressive content marketing; Kolleno has AI reply analysis. Both targets offer commercial-intent SERP wins. | Low each (clone pattern) |
| **6 (do Day 10-12)** | Upgrade `/ar-audit` and `/ar-roi` with FAQPage schema + "for Xero" / "for QuickBooks" tags | Edit existing | These are the lead-magnet tools; conversion-critical; schema is missing. | Low |
| **7 (do Day 12-14)** | Bundle `/blog/invoice-reminder-template-library` (or `/templates`) | New hub page | Aggregates the existing `/blog/best-dunning-templates-2026` and `/tools/dispute-email-template` into a single linkable hub. | Medium |
| **8 (do Day 14-16)** | Expand `/for/*` from 3 to 9 (add bookkeepers, digital-marketing, creative, AU, CA, UK-consultancies) | 6 new /for/* pages | Single biggest unforced expansion of topically-relevant pages on the domain. Each is a small investment. | Low each |
| **9 (do Day 16-19)** | `/blog/agency-invoice-chasing-checklist-2026` (gated checklist PDF) | New blog post + lead magnet | Captures the long-tail "agency invoice chasing checklist" + creates a new email-capture point. | Medium |
| **10 (do Day 19-22)** | `/features/promise-to-pay` + `/blog/promise-to-pay-tracking-template` | 1 new feature page + 1 blog post | Niche, very high commercial intent; currently no dedicated page on Collectly. | Medium |
| **11 (do Day 22-25)** | `/tools/cash-flow-forecast` (interactive 13-week) | New free tool | Mirrors the structure of `/tools/dso-calculator` which is the strongest off-page linkable asset on the site. | Medium-high |
| **12 (do Day 25-27)** | `/integrations/xero` + `/integrations/quickbooks` | 2 new category pages | Owns the largest unforced commercial-intent keyword family (Cluster 1, Section 1). | Medium |
| **13 (do Day 27-29)** | `/ar-automation` pillar | 1 new pillar page (2,500 words) | Long-term play (Section 3, Term 1); publish now so it gains topical authority over the next 90 days. | High |
| **14 (do Day 29-30)** | Upgrade every blog post with FAQPage + metadata polish + internal links to the new pages | Edit existing | Compounds the new-publication gains from priority 1-13. | Low |

**Output volume in 30 days:** 12 new pages, 7 upgraded pages, 1 new tool, 1 new pillar, 1 listicle. Plus a checklist PDF as a lead magnet.

> **Why this order.** Days 1-7 capture the cheapest "comparing-X" queries (high intent, low effort, every other piece of content will link to them). Days 8-14 expand the industry-beachhead pages. Days 15-22 layer in niche commercial-intent plays. Days 23-30 seed the long-term SERP plays (pillar + integrations + cash-flow tool). The compounding benefit of internal linking kicks in fully at ~Day 21.

---

## Section 6 — Quick Technical SEO Notes

These are observations from a read of the live source files and the live sitemap. None required file modifications (I didn't touch the repo).

### ✅ Already done well
1. **Per-page metadata is centralised through `pageMetadata()`** in `src/lib/seo.ts`. Titles, descriptions, canonicals, keywords, OG, Twitter all flow consistently. Switching a single field updates everything.
2. **JSON-LD across the site is correct and minimal.** The root layout in `src/app/layout.tsx` injects Organization + SoftwareApplication + WebSite (SearchAction). Each page adds per-page schemas: FAQPage on home / pricing / features, BreadcrumbList via `<StructuredBreadcrumbs>`, Article + BreadcrumbList on every blog post, Product+Offer on pricing.
3. **Brand disambiguation is built into the SEO helper.** `TAGLINE`, `BRAND_LONG`, `KEYWORDS_PRIMARY` constants make Google-side name collisions (with the healthcare billing Collectly) manageable.
4. **Sitemap is comprehensive.** `src/app/sitemap.ts` sets priority + changefreq per page class (vs-* at 0.9, /for/* at 0.8-0.9, tools at 0.7-0.8, blog at 0.6-0.8). All 9 /vs-* pages, 3 /for/* pages, 4 /tools/* pages, 2 lead-magnet tools, 7 blog posts, all trust pages are present.
5. **RSS feed** (`/rss.xml`) is wired and referenced from the blog index + from `alternates.types` in the root metadata. Bing indexes RSS fast.
6. **Verification tokens** are placeholders (GSC token present, Bing via env). Re-paste and confirm before the next site re-launch.
7. **Robots:** `<meta name="robots">` set to `index: true, follow: true, max-image-preview: large, max-snippet: -1, max-video-preview: -1`. Googlebot duplicated at the same level.
8. **lang="en-GB"** on `<html>` is correct for an international audience (US/UK/AU/CA all tolerate en-GB well).

### ⚠️ Gaps worth closing
9. **No localized `/blog` or `/pricing` variants.** For a multi-region site (US/UK/AU/CA), adding `hreflang="en-US"` / `en-GB"` / `en-AU"` / `en-CA"` on `/pricing` and `/features` would surface the correct region in SERPs and improve CTR. Low effort, high regional-SEO return.
10. **`/compare` exists but is light.** Listing the 9 /vs-* competitor pages with one-line descriptions and a hero H1 + CTA. Worth checking that it has FAQPage schema and an explicit "Compare all AR tools for [Xero / QuickBooks]" filtered table — would compete with Chaser's own comparison hub.
11. **No `/vs-paidnice`, `/vs-upflow`, `/vs-kolleno`, `/vs-dunivo`, `/vs-billtrust`.** Five missed competitive SERP entries. (See Section 5, items 1, 5.)
12. **No `/integrations/xero`, `/integrations/quickbooks`.** Integration pages are typically the strongest organic landing pages for SaaS — they target "Xero + AR" / "QuickBooks + AR" queries that don't compete against your own homepage.
13. **No `ItemList` schema on `/compare` or `/blog`.** Adding `ItemList` JSON-LD on the homepage comparison grid could earn a "List" rich result.
14. **The blog post template does not declare `publisher.logo` width/height** — small, but Google has been picky about logo dimensions (4:1 aspect, 600×60 minimum preferred). The current `logo: { '@type': 'ImageObject', url: '/icon.svg' }` is a square favicon. Consider a horizontal logo variant.
15. **`blogBreadcrumbs` always emits `Home → Blog → Post`.** When posts are part of a cluster (e.g., the "AR automation" pillar series), the breadcrumbs could include a category. Optional, minor.
16. **No author schema outside of `articleJsonLd`.** Each blog post is authored "Davie" by default. That's fine, but adding a persistent `Person` schema (about page or posts index) builds E-E-A-T signals.
17. **`modifiedTime` is not set on most blog posts.** `articleJsonLd` does default `dateModified` to `datePublished`, but updating the most-recent blog posts to include actual `modifiedTime` is a real (small) ranking factor for time-sensitive posts (especially dunning templates, DSO benchmarks, Chaser pricing).
18. **HTML `lang="en-GB"` on every page** while the homepage copy and many posts use USD and "US" examples. Google's fine with this, but aligning `lang` to content region (or adding `hreflang` en-US) is more accurate.
19. **`/robots.txt` exists** at `src/app/robots.ts`. Worth confirming it references `/sitemap.xml` (typical pattern) — I didn't open it but the file's presence is good.
20. **Image alt text audit needed.** The OG images (`/og-vs-chaser.png`, etc.) all have alt text via the metadata builder. Inline content images are not, from the snippets I read. Treated as a low-priority housekeeping item.

### 🟢 Off-page / authority plays (no code changes)
21. **G2, Capterra, GetApp, Crozdesk, Software Advice vendor profiles** — submit + populate once, never update. These are directory pages with high DR that pass value into the product pages.
22. **Xero App Store listing** — once live, this is the single highest-value backlink a SaaS in this space can get.
23. **LinkedIn employee / founder posts** that link to `/blog/*` and `/vs/*` — every blog post published should get 1-2 organic LinkedIn mentions from a real person, not a "thought leadership carousel".
24. **Three real backlinks per month from finance, SaaS, or agency-niche blogs** ("Xero apps we use", "Tools for our agency", "What we use to collect on retainer invoices"). Don't pay for these; ask.

---

## Appendix — What I deliberately did NOT do

- Modified no files in the repo. The `seo/` directory was empty before this report; I created `collectly/seo/keyword-content-plan-2026-08-04.md` only.
- Ran no commands that change state.
- No paid tools or services were recommended.
- No outbound messages were sent.

## Caveats on the data

- Search-volume bands are **informed estimates**, not live-tool values. Without GSC or an API-connected keyword tool, the numbers are directional bands. Treat "5k-10k/mo" as "between 5,000 and 10,000 monthly searches in the US/UK/AU/CA combined."
- "Top SERPs named" are the actual organic listings I observed at fetch time (2026-08-04 19:23 UTC). They may shift daily.
- Live page content was confirmed via:
  - `<title>` tags (which returned correctly from server-rendered metadata)
  - the live sitemap (full XML)
  - the page-source files in the repo (which are the actual served templates; the site is JS-shell-loaded)
  - the `lib/seo.ts` and `lib/posts.ts` source for keywords and posts.
  Where the live page returns `Loading…` (the JS shell), I worked from the source files. The metadata and structured-data analysis is from source and is reliable; the body-copy tone assessment is from source.
