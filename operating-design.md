# OpenClaw AI Workforce — Operating Design for Collectly

Solo-founder SaaS, OpenClaw as first workforce.

**Source of truth:** This file is the master reference for all Collectly skills.

## Legend

- **Autonomy:** `Full` = runs unattended | `Semi` = runs unattended, flags edge cases | `Gated` = drafts only, human approves
- **Requires:** `API` / `OAuth` / `Browser` / `Local` / `External-Svc` / `None`
- **Priority:** `P0` (blocking launch) `P1` (needed for growth) `P2` (nice-to-have/scale)
- **Complexity:** `L` `M` `H`

## AI Organization Chart

FOUNDER (Faith)
 — Vision, pricing decisions, legal sign-off, financial approval, OAuth grants
 │
 └── OPENCLAW (Chief of Staff / Orchestrator agent)
     │
     ├── CEO SUPPORT
     ├── STRATEGY & MARKET INTEL
     ├── SALES & GROWTH
     ├── MARKETING
     ├── PRODUCT
     ├── ENGINEERING
     ├── DEVOPS
     ├── CUSTOMER SUCCESS
     ├── FINANCE
     ├── OPERATIONS
     ├── ANALYTICS
     ├── SECURITY
     ├── LEGAL
     ├── HR (dormant until hire #1)
     └── AI OPERATIONS

## Skill Registry

### CEO Support
- Daily Briefing Generator — P0, L, Full
- Decision Memo Prep — P1, M, Gated
- Meeting/Call Prep Packet — P1, L, Semi

### Business Operations & Strategy
- SOP Library Maintainer — P0, L, Full
- OKR/Goal Tracker — P1, M, Semi
- Quarterly Strategy Review Drafter — P2, M, Gated

### Market Research & Competitor Intelligence
- Market Sizing & Trend Scanner — P1, L, Full
- ICP Refinement Engine — P1, M, Semi
- Competitor Monitoring — P0, L, Full
- Competitor Feature Diff Tracker — P1, M, Semi

### Customer Research
- Customer Interview Synthesizer — P1, M, Semi
- Voice-of-Customer Miner — P1, M, Full

### Sales
- Lead Generation Scraper — P0, M, Full
- Lead Qualification Scorer — P0, L, Full
- Prospect Research Enricher — P0, M, Semi
- Outreach Sequencer — P0, H, Full
- Follow-up Scheduler — P0, L, Full
- Reply Classifier & Router — P0, M, Full
- CRM Auto-Logger — P0, L, Full
- Deliverability Health Monitor — P0, M, Full

### Marketing
- SEO Keyword & Content Gap Finder — P1, M, Full
- Content Marketing Writer — P1, M, Gated
- Landing Page Generator/Optimizer — P1, M, Gated
- Copywriting Assistant — P0, L, Semi
- Social Media Scheduler/Writer — P2, M, Gated
- Email Newsletter Composer — P2, L, Gated
- Brand Voice Guide Keeper — P1, L, Full

### Product
- Feature Request Tracker — P0, L, Full
- Roadmap Planner — P1, M, Gated
- Feedback Analysis Engine — P1, M, Semi

### Engineering
- Architecture Decision Recorder — P0, L, Full
- Automated Code Review — P0, M, Semi
- Test Generation & Coverage — P0, M, Semi
- Bug Triage & Prioritization — P0, L, Full
- Docs Generator — P1, L, Full

### DevOps
- Deployment Pipeline Manager — P0, H, Semi
- Uptime/Error Monitoring & Alerting — P0, M, Full

### Customer Success
- Support Ticket Triage & First-Response — P0, M, Semi
- Onboarding Flow Orchestrator — P0, M, Full
- Knowledge Base Auto-Writer — P1, L, Full

### Finance
- Revenue/MRR Dashboard — P0, M, Full
- Cashflow Forecaster — P1, M, Semi
- Invoice Generator/Reminder — P1, L, Full
- Pricing Experiment Analyzer — P2, M, Semi

### Operations & Analytics
- Task/Project Auto-Tracker — P0, L, Full
- KPI Dashboard Builder — P0, M, Full
- Weekly/Monthly Reporting Digest — P1, L, Full

### Security
- Secret Rotation Reminder & Auditor — P0, M, Semi
- Dependency Vulnerability Scanner — P0, L, Full
- Access Review Auditor — P1, M, Semi

### Legal
- Contract/ToS Review Assistant — P1, M, Gated
- Policy Drafting — P0, M, Gated

### HR (dormant)
- Job Post & Resume Screener — P2, L, Semi
- Interview Question Generator — P2, L, Full
- Contractor Onboarding/Training Builder — P2, L, Full

### AI Operations
- Prompt Library Manager — P0, L, Full
- New Skill Builder — P0, H, Gated
- Workflow Optimizer / Self-Eval Loop — P1, H, Semi
- OpenClaw Knowledge Curator — P0, M, Full

## Skill Dependency Graph (key chains)

OpenClaw Knowledge Curator ─┬─> everything
Deployment Pipeline Manager ─> Automated Code Review ─> Test Generation ─> Bug Triage
Lead Generation Scraper ─> Lead Qualification Scorer ─> Prospect Research Enricher
  ─> Outreach Sequencer ─> Reply Classifier & Router ─> Follow-up Scheduler
  ─> CRM Auto-Logger ─> ICP Refinement Engine (feeds back)
Deliverability Health Monitor ─> Outreach Sequencer (gates sending)
Support Ticket Triage ─> Knowledge Base Auto-Writer ─> Feature Request Tracker ─> Roadmap Planner
Revenue/MRR Dashboard ─> Cashflow Forecaster ─> Quarterly Strategy Review Drafter
KPI Dashboard Builder ─> Weekly/Monthly Reporting Digest ─> Daily Briefing Generator
Secret Rotation Auditor + Dependency Vulnerability Scanner ─> Automated Code Review
Policy Drafting ─> Contract/ToS Review Assistant
New Skill Builder ─> (creates/extends every skill)

## Implementation Phases

### Phase 0 — Stabilize & Foundation (Weeks 1-2)
Fix dev/prod isolation, rotate leaked QBO secret, stand up Knowledge Curator + SOP Maintainer + Automated Code Review + Bug Triage + Daily Briefing.

### Phase 1 — Launch Engine (Weeks 2-4)
Lead Gen → Qualification → Research → Outreach → Reply Routing → CRM chain; Deliverability Monitor; Onboarding Flow; Support Triage.

### Phase 2 — First Customers (Weeks 4-8)
Landing Page + Copy skills; Competitor Monitoring + Market Scanner; Revenue Dashboard + KPI Dashboard.

### Phase 3 — Growth (Months 2-4)
ICP Refinement; Feedback Analysis + Roadmap Planner; Content/SEO engine; Knowledge Base.

### Phase 4 — Scale (Months 4+)
Pricing experiments, forecasting, brand/social, HR skills.

## Founder's Rule

At every phase gate, any task that is repetitive and doesn't require an OAuth login, API key acquisition, legal/financial sign-off, product-vision judgment, or physical presence should already be a skill by the time it's needed a second time.
