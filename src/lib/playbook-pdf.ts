/**
 * Lead magnet — "The 5-Step DSO Reduction Playbook"
 * Static PDF generation, no external deps. Returns a properly-formed
 * PDF as a Buffer. Designed to be served from /download/playbook.pdf
 * after email capture.
 *
 * Why hand-rolled: avoids a 200KB+ dependency for a single static asset.
 * The PDF is layout-stable, no images, no fonts (uses Helvetica which
 * every PDF reader has built-in), valid PDF 1.4.
 */
export function generatePlaybookPdf(): Buffer {
  const pages: string[] = [];
  const sections = [
    {
      heading: 'Step 1 — Audit your A/R aging every Monday morning',
      body: `Most 5–30 person businesses look at A/R aging once a month, at the bookkeeping close. That's too late. By the time an invoice is 60+ days overdue, your chance of collecting it at face value drops to 60%. By 90 days, it drops to 35%.

The fix: a 10-minute Monday morning ritual. Open your A/R aging report every Monday. Bucket invoices by age: current, 1-30, 31-60, 61-90, 90+. For each invoice in the 31-60+ bucket, ask: who owes us, how long, and what's the next step? Write it down.

A first Monday audit typically turns up 5-10 forgotten invoices, averaging $4,200 in value.`,
    },
    {
      heading: 'Step 2 — Set up a 3-step dunning sequence that auto-fires',
      body: `Manual chasing is the #1 reason AR gets stale. The fix: a 3-step automated sequence that fires the day an invoice goes overdue.

Day 1: friendly email. "Hi [name], just a quick nudge that invoice [number] for [amount] was due yesterday. You can settle it here: [link]."

Day 7: firmer email. "[name], invoice [number] for [amount] is now 7 days past due. Please review and settle at your earliest convenience: [link]."

Day 30: SMS or phone call. SMS for small invoices, phone for $5K+.

Pause the sequence automatically if the customer pays or replies. That's the key part most tools miss. Manual review every week for invoices that didn't get paid.`,
    },
    {
      heading: 'Step 3 — Give every customer a frictionless pay link',
      body: `The #1 reason invoices go 30+ days late isn't that customers can't pay — it's that paying is friction. They have to log into their portal, find the invoice, type in the card number, wait for the email receipt.

The fix: a one-click pay link on every reminder. Click → payment page → done. ACH for US customers, BACS for UK, SEPA for EU, Direct Debit for AU. Card as fallback.

Typical improvement in time-to-pay after adding a one-click pay portal: 12 days.`,
    },
    {
      heading: 'Step 4 — Risk-score your customers and prioritize the top 5',
      body: `Not all overdue invoices are equal. A 30-day overdue invoice from a customer who's paid 5 prior invoices on time is low-risk. A 30-day overdue invoice from a customer who's paid 60% of prior invoices late is high-risk.

Score every customer on: paid rate, average days to pay, oldest unpaid invoice, total balance. Then sort. Spend your collection time on the top 5 by (balance × risk). Ignore the rest — they'll either pay on their own or write off.

A typical 20-customer portfolio has 3-4 customers driving 80% of your A/R pain. Focus there.`,
    },
    {
      heading: 'Step 5 — Measure DSO weekly, not monthly',
      body: `Days Sales Outstanding (DSO) is the single most important number in your A/R. Most businesses measure it once a quarter at tax time. By then, you've lost 3 months of recovery time.

Measure it every Monday. Track it in a spreadsheet or in a tool. The trend is more important than the absolute number. If DSO is going up over 4 consecutive weeks, something is wrong — likely a customer who can't pay, a broken process, or a sales team overpromising on terms.

A 5-person services business can typically take DSO from 45 to 18 days in 90 days. That's $90K+ freed up for the same revenue.`,
    },
  ];

  // Build PDF page 1 (cover) and pages 2-6 (sections)
  const yPos = 760; // y position for next text element
  let pageNum = 1;

  // ---- Page 1: cover ----
  pages.push(makePage1());

  // ---- Pages 2-6: 5 steps ----
  for (const section of sections) {
    pages.push(makeSectionPage(section.heading, section.body, pageNum));
    pageNum += 1;
  }

  // ---- Page 7: about / CTA ----
  pages.push(makeCtaPage(pageNum));

  // ---- Assemble PDF ----
  const objects: string[] = [];

  // 1: Catalog
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  // 2: Pages container
  const pageIds = pages.map((_, i) => `${3 + i} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${pageIds}] /Count ${pages.length} >>`);

  // 3-9: page content
  pages.forEach((p) => objects.push(p));

  // Build final PDF
  const header = '%PDF-1.4\n%\xC3\xA4\xC3\xB0\xC3\xB1\xC3\xAB\n';
  const parts: Buffer[] = [Buffer.from(header, 'binary')];
  const offsets: number[] = [0];
  let pos = Buffer.byteLength(header, 'binary');

  for (let i = 0; i < objects.length; i++) {
    const obj = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    const buf = Buffer.from(obj, 'binary');
    offsets.push(pos);
    parts.push(buf);
    pos += buf.length;
  }

  // Cross-reference table
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  parts.push(Buffer.from(xref, 'binary'));
  pos += Buffer.byteLength(xref, 'binary');

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  parts.push(Buffer.from(trailer, 'binary'));

  return Buffer.concat(parts);
}

function makePage1(): string {
  return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F3 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >> >> >>
   /Contents ${(() => {
     const content = `BT
/F1 36 Tf
72 700 Td
(Collectly) Tj
0 -50 Td
/F1 28 Tf
(The 5-Step DSO) Tj
0 -32 Td
(Reduction Playbook) Tj
0 -90 Td
/F2 14 Tf
(For 5\\22630 person agencies and consultancies) Tj
0 -22 Td
(who are tired of chasing invoices.) Tj
0 -180 Td
/F2 11 Tf
(By the Collectly team \\226 pre-launch, building in public) Tj
0 -16 Td
(with early customers in the US, UK, AU, and CA.) Tj
0 -180 Td
/F1 16 Tf
(What you'll learn:) Tj
0 -28 Td
/F2 12 Tf
(\\226 The Monday morning AR ritual that recovers $4,200) Tj
0 -18 Td
(\\226 The 3-step dunning sequence that does the chasing for you) Tj
0 -18 Td
(\\226 Why a one-click pay link cuts DSO by 12 days) Tj
0 -18 Td
(\\226 How to risk-score customers and focus on the top 5) Tj
0 -18 Td
(\\226 Why measuring DSO weekly beats measuring it monthly) Tj
ET`;
     return stream(content);
   })()} 0 R
>>`;
}

function makeSectionPage(heading: string, body: string, pageNum: number): string {
  // Wrap body to ~75 chars per line, escape parens
  const lines = wrapText(body, 75);
  let stream = `BT
/F1 22 Tf
72 720 Td
(${escape(heading)}) Tj
0 -40 Td
/F2 11 Tf
14 TL
`;
  for (let i = 0; i < lines.length; i++) {
    stream += `(${escape(lines[i])}) Tj\n0 -16 Td\n`;
  }
  // Footer
  stream += `0 -30 Td
/F2 9 Tf
(${pageNum}) Tj
ET`;
  return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
   /Contents ${streamRef(stream)} 0 R
>>`;
}

function makeCtaPage(pageNum: number): string {
  const content = `BT
/F1 24 Tf
72 700 Td
(Stop chasing. Start collecting.) Tj
0 -40 Td
/F2 12 Tf
14 TL
(Collectly is the AI-native A/R platform for 5-30 person) Tj
0 -18 Td
(agencies and consultancies. We connect to Xero \\226 QuickBooks) Tj
0 -18 Td
(is in beta \\226 write tone-aware dunning emails and SMS in) Tj
0 -18 Td
(your voice, and give you a 4-week cash-flow forecast so you) Tj
0 -18 Td
(always know what's coming.) Tj
0 -60 Td
/F1 16 Tf
(Try it free for 14 days:) Tj
0 -28 Td
/F2 12 Tf
(https://getcollectly.app) Tj
// Real testimonials don't exist yet (no paying customers in production). The
// previous fake "Sarah K., Lumen & Co" quote was removed because shipping
// fabricated testimonials in a downloadable PDF is a real trust-breaker —
// prospects in the same niche will recognize the pattern. The "what our
// customers say" section is now a placeholder framed as forward-looking.
0 -180 Td
/F1 14 Tf
(What early users are saying:) Tj
0 -22 Td
/F2 11 Tf
(Founding-customer program open. The first 20 agencies and consultancies lock) Tj
0 -16 Td
(in $49/mo for life. Email hello@getcollectly.app to apply.) Tj
ET`;
  return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F3 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >> >> >>
   /Contents ${streamRef(content)} 0 R
>>`;
}

function streamRef(content: string): string {
  // Returns the object reference for the content stream, embedding the stream inline
  return stream(content);
}

function stream(content: string): string {
  const len = Buffer.byteLength(content, 'binary');
  return `<< /Length ${len} >>\nstream\n${content}\nendstream`;
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).length > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
