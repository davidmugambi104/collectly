# Lead Magnet Spec: "How much revenue is your agency losing to late payments?"

## Purpose
- Qualify visitors by pain level.
- Capture email for follow-up.
- Provide a shareable asset that ranks for long-tail SEO.

## Inputs
1. Average invoice size ($)
2. Average days invoices are paid late
3. Number of active clients with outstanding invoices
4. Estimated hours per week spent chasing payments
5. Hourly value of the person doing the chasing (founder/ops/bookkeeper rate)

## Outputs
- **Revenue at risk**: (avg invoice × late days × annual interest cost / 365) × clients
- **Time cost per month**: hours/week × hourly rate × 4.3
- **Combined annual drag**: revenue at risk + time cost × 12
- **Comparison line**: "Agencies like yours typically recover 30–40% of this with automated follow-up."
- **CTA**: "Get the free AR health check" or "See how Collectly cuts this in half" → email capture.

## Page structure
1. Headline: "How much is late payment costing your agency?"
2. Subhead: "2-minute calculator. No signup required."
3. Input form (5 fields).
4. Results card with dollar figure and breakdown.
5. Optional email gate to "save the report" or "get the AR playbook."
6. Soft CTA to Collectly trial/book a call.

## Build path
- Static Next.js page at `/tools/ar-cost-calculator`
- Client-side JS for calculation (no backend needed for MVP).
- Optional: store emails in a simple form endpoint or Resend audience later.

## Next action
Create the page in `collectly/src/app/tools/ar-cost-calculator/page.tsx`.
