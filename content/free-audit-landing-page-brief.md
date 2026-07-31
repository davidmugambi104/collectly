# Collectly Free Audit Landing Page Brief

## Goal
Convert LinkedIn visitors and organic traffic into audit requests by reducing friction to one decision: "Do I want to know how much I'm owed?"

---

## URL
`https://getcollectly.app/free-audit`

---

## Page structure

### Hero section

**Headline:**  
Find the money your agency already earned.

**Subheadline:**  
Free 2-minute audit of your QuickBooks or Xero receivables. See what's overdue, which clients pay slowest, and what you could recover — no sales call required.

**Primary CTA:**  
Start My Free Audit

**Trust bar below CTA:**  
✓ No credit card  ✓ No sales call  ✓ Read-only access  ✓ 24-hour video turnaround

---

### Problem section

**Headline:** Most agencies don't know how much they're owed until cash gets tight.

**Bullets:**
- Invoices go overdue because follow-up has no owner.
- Founders chase payments instead of selling.
- The same clients pay late every quarter.
- By the time you notice, you've already lost leverage.

**Supporting stat:**  
"Agencies using Collectly recover an average of 10–20% of overdue revenue within 90 days."

---

### How it works section

**Headline:** What happens in 2 minutes.

**3 steps:**
1. **Connect** — Secure read-only access to QBO or Xero.
2. **Analyze** — Collectly surfaces overdue invoices and slow-paying clients.
3. **Review** — You get a short video walkthrough with a clear recovery plan.

---

### Form section

**Headline:** Get your free audit.

**Fields:**
| Field | Required | Type | Notes |
|---|---|---|---|
| First name | Yes | text | Used in personal video |
| Work email | Yes | email | Primary lead contact |
| Company name | Yes | text | For audit context |
| Accounting software | Yes | select | QBO / Xero / Other |
| Estimated monthly revenue | No | select | Helps prioritize |
| Biggest AR pain point | No | textarea | Qualification signal |

**Submit button:** Show Me My Overdue Invoices

**Privacy note below form:**  
"We only read your receivables data. We never store passwords or make changes to your books."

---

### Social proof section

**Headline:** Founders use Collectly to stop chasing invoices.

**Testimonial (placeholder until real):**  
"I thought our AR was under control. The audit found $38k in overdue invoices we'd stopped noticing."  
— Founder, 12-person branding agency

**Logos:** QBO, Xero integration badges

---

### FAQ section

**Q: Is this really free?**  
A: Yes. The audit is free. If you want Collectly to automate follow-ups, we'll talk pricing after you see the value.

**Q: Do I have to connect my accounting software?**  
A: No, but the audit is much more useful if you do. You can also upload an AR aging report.

**Q: Is my data safe?**  
A: We use read-only OAuth and do not store your login credentials. You can revoke access anytime.

**Q: How long until I get the audit?**  
A: Within 24 hours, usually same day.

---

## Technical requirements

### Form submission
- POST to `/api/audit-request`
- Validate email format and company name
- Store in `collectly/outreach/data/inbound-leads.csv`
- Trigger notification to founder via email/Slack

### CSV schema for `inbound-leads.csv`
```csv
id,requested_at,first_name,email,company,accounting_software,estimated_revenue,pain_point,source,qbo_connected,xero_connected,status,audit_sent_at,audit_video_url,next_step,notes
```

### QBO/Xero connection
- Reuse existing Collectly QBO/Xero OAuth flow
- Request only read-only scopes for receivables
- After connection, redirect back to `/free-audit?connected=true`
- Show confirmation: "Connected. Your audit will arrive within 24 hours."

### Notification
- Send email to `davie@getcollectly.app` or configured founder email
- Include lead details and link to any connected accounting data

### Tracking
- UTM params: `?utm_source=linkedin&utm_medium=social&utm_campaign=organic_audit`
- Event log: `audit_request`, `qbo_connected`, `xero_connected`, `audit_delivered`

---

## Conversion targets

| Metric | Week 1 | Month 1 | Month 3 |
|---|---|---|---|
| Landing page visitors | baseline | 100 | 500 |
| Audit requests | 1 | 10 | 50 |
| Connected QBO/Xero | 1 | 6 | 30 |
| Audits delivered | 1 | 8 | 40 |
| Positive replies / demos | 0 | 2 | 8 |

---

## Files to create

1. `collectly/content/free-audit-landing-page-brief.md` — this file
2. `collectly/outreach/data/inbound-leads.csv` — lead storage
3. `collectly/outreach/scripts/process_audit_request.py` — form handler stub
4. `collectly/content/post-log-YYYY-MM-DD.md` — weekly post tracking

---

## Next steps

1. Davie reviews copy and approves tone.
2. Build the landing page in the Collectly app.
3. Connect form to lead CSV and notification.
4. Start posting Week 1 content to LinkedIn.
5. Track metrics weekly.
