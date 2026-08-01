import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { StructuredBreadcrumbs } from '@/components/seo/structured-breadcrumbs';
import { pageMetadata, faqJsonLd, webPageJsonLd, softwareAppJsonLd } from '@/lib/seo';
import { CheckCircle2, ArrowRight, FileText } from 'lucide-react';
import { DisputeTemplateList } from '@/components/tools/dispute-template-list';

// Free tool page — keyword target: "dispute email template", "invoice
// dispute template", "client dispute response", "purchase order dispute
// template". Designed to:
//   1. Capture organic search for "free template" queries.
//   2. Step the prospect through a quick form (or use the template
//      directly).
//   3. Funnel into the audit or the founding-cohort.

export const metadata = pageMetadata({
  title: 'Free invoice-dispute email template — works for missing PO and pricing',
  description:
    '5 free, copy-paste email templates for the most common invoice ' +
    'disputes: missing PO, wrong amount, wrong billing details, not yet ' +
    'received by AP, and pricing dispute. Works for Xero, QuickBooks, and ' +
    'any small-business accounting setup.',
  path: '/tools/dispute-email-template',
  image: '/og-ar-audit.png',
  keywords: [
    'invoice dispute email template',
    'missing PO email template',
    'client invoice dispute response',
    'purchase order discrepancy email',
    'pricing dispute template',
    'AP invoice dispute reply',
    'collections email template',
  ],
});

const disputeJsonLd = JSON.stringify([
  webPageJsonLd({
    title: 'Free invoice dispute email templates',
    description:
      '5 free, copy-paste email templates for the most common invoice ' +
      'disputes that go to small-business A/R teams.',
    path: '/tools/dispute-email-template',
  }),
  softwareAppJsonLd(),
  faqJsonLd([
    {
      q: 'When should I send a dispute reply email?',
      a: 'As soon as the customer raises the dispute. Prompt, specific ' +
         'replies close disputes up to 2x faster than waiting until the next ' +
         'reminder cycle. The point of a dispute reply is to acknowledge ' +
         'and commit to a fix-date, not to argue.',
    },
    {
      q: 'What is the most common invoice dispute?',
      a: 'Missing purchase order (PO) — accounts payable teams cannot ' +
         'release payment without a matching PO. The dispute reply should ' +
         'confirm whether the PO exists, request a copy, or note that ' +
         'future invoices will require a PO on file before being issued.',
    },
    {
      q: 'Should I ever pay a pricing dispute immediately?',
      a: 'No. A pricing dispute without a written acknowledgement (a ' +
         'quote, statement of work, or signed estimate) will recur on ' +
         'every invoice. Resolve the dispute by attaching the original ' +
         'pricing reference, not by adjusting the bill ad-hoc.',
    },
    {
      q: 'How long does an invoice dispute typically take to resolve?',
      a: 'For small businesses on Xero: 5-10 business days. The Collectly ' +
         'dispute classifier pauses reminders automatically during the ' +
         'dispute window so customers never receive a redundant reminder ' +
         'while the dispute is open.',
    },
  ]),
]);

const TEMPLATES = [
  {
    name: 'Missing purchase order',
    subject: 'Re: Invoice {{invoiceNo}} — PO needed to release payment',
    body: `Hi {{firstName}},

Thanks for the heads-up that invoice {{invoiceNo}} is on hold pending a PO.

Could you confirm whether the PO exists on your side and share it back to me? If a PO wasn't raised internally for this work, I'd appreciate the chance to send through a credit note for any time we worked outside the agreed scope — and I'll make sure future invoices include the PO on the invoice itself so this doesn't happen again.

If you'd like to send through the PO today, I can confirm receipt and arrange for the invoice to be re-released to your accounts payable team within an hour.

Best,
{{yourName}}`,
    when: 'When accounts payable says "no PO on file"',
  },
  {
    name: 'Wrong amount',
    subject: 'Re: Invoice {{invoiceNo}} — amount discrepancy',
    body: `Hi {{firstName}},

Thanks for flagging the amount question on invoice {{invoiceNo}}. The invoice was issued for {{oursAmount}} based on the {{referenceDoc}} we agreed on {{agreedDate}} — I've attached a copy for your reference.

If your team has a different record of the agreed value, could you share that with me so we can reconcile? I'll hold the invoice in dispute status until we've both signed off on the figure, then issue a credit note and re-invoice if needed.

Best,
{{yourName}}`,
    when: 'When the customer says the amount does not match the agreement',
  },
  {
    name: 'Invoice not received by AP',
    subject: 'Re: Invoice {{invoiceNo}} — confirming receipt on your end',
    body: `Hi {{firstName}},

Thanks for letting me know invoice {{invoiceNo}} didn't reach your accounts payable team. The invoice was sent on {{issuedDate}} from our billing system to {{theirEmail}} — could you confirm whether that is the correct address for AP?

If not, I'll update our records and re-send the invoice to the right contact today. If yes, it's possible the email was caught in a spam filter — happy to send a PDF copy directly to whoever needs it for processing.

Best,
{{yourName}}`,
    when: 'When AP claims the invoice was never received',
  },
  {
    name: 'Wrong billing details',
    subject: 'Re: Invoice {{invoiceNo}} — billing details update',
    body: `Hi {{firstName}},

Thanks for the updated billing details. I'll reissue invoice {{invoiceNo}} today with the right entity name, address, and any tax IDs you need on there — could you send through the official "bill to" details so I get this right the first time?

I'll mark the original invoice as void in our system at the same time so there is no confusion on your AP side. The new invoice will land in your inbox within an hour.

Best,
{{yourName}}`,
    when: 'When customer says the entity name or address on the invoice is wrong',
  },
  {
    name: 'Pricing dispute (agreement unclear)',
    subject: 'Re: Invoice {{invoiceNo}} — pricing alignment',
    body: `Hi {{firstName}},

Appreciate you raising the pricing question on invoice {{invoiceNo}}. The {{lineItem}} line on this invoice reflects the {{rateType}} rate we agreed in {{referenceDoc}} on {{agreedDate}} — I've attached that document here for your records.

If the rate we billed is different from what your side expects, I'd like to understand the gap before either re-invoicing or issuing a credit note. Could you share the rate sheet or contract reference you're working from, and I'll reconcile?

Either way, I'll keep the invoice paused while we sort the rates out, so no chasing on your end until we agree on the number.

Best,
{{yourName}}`,
    when: 'When customer disputes the rate itself, not the amount',
  },
];

export default function DisputeTemplatePage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: disputeJsonLd }} />
      <StructuredBreadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Free tools', path: '/tools/dispute-email-template' },
          { name: 'Dispute email templates', path: '/tools/dispute-email-template' },
        ]}
      />
      <MarketingHeader />
      <section className="container-page pt-16 pb-12 max-w-3xl">
        <p className="eyebrow">Free tool</p>
        <h1 className="mt-3 h1">5 free invoice-dispute email templates.</h1>
        <p className="mt-5 lead">
          Copy-paste templates for the most common invoice disputes that go
          to a small-business A/R team. Each template is structured to
          acknowledge the dispute, request the right next action, and avoid
          a redundant reminder while the dispute is open.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-ink-700">
          <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Works for Xero, QuickBooks, and any business that issues invoices.</li>
          <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Slots in {'{firstName}'}, {'{invoiceNo}'}, {'{agreedDate}'} placeholders.</li>
          <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Built to keep the customer relationship intact while you resolve.</li>
        </ul>
      </section>
      <section className="container-page pb-20">
        <DisputeTemplateList templates={TEMPLATES} />
      </section>
      <section className="bg-brand-600 text-white">
        <div className="container-page py-12 max-w-3xl">
          <h2 className="h2">Don't keep writing these by hand.</h2>
          <p className="mt-4 lead text-brand-100">
            Collectly classifies incoming replies automatically and pauses the
            reminder sequence on every disputed invoice. No more chasing the
            customer who already told you they have an issue.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href="/ar-audit" className="btn-primary inline-flex items-center gap-1.5">
              Get a free A/R health audit <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/pricing" className="btn-secondary inline-flex items-center gap-1.5">
              See Collectly pricing
            </a>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
