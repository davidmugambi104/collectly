// Deterministic relevance scoring for lead items. No network, no randomness: same input, same score.

const PAIN = [
  [/\b(chas(e|ing)|follow(ing)?[\s-]?up)\b.{0,40}\binvoices?\b/i, 14],
  [/\b(overdue|unpaid|outstanding|past[\s-]?due)\b.{0,20}\b(invoices?|bills?|balances?)\b/i, 14],
  [/\blate[\s-]?pay(ment|ments|ing|ers?)?\b|\bslow[\s-]?pay(ers?|ment)?\b/i, 12],
  [/\b(client|customer)s?\b.{0,30}\b(won'?t|doesn'?t|don'?t|not|never|stopped)\b.{0,12}\bpay(ing)?\b/i, 12],
  [/\bghost(ed|ing)\b/i, 6],
  [/\b(payment|invoice)\s+reminders?\b|\bdunning\b|\bcollections?\b/i, 10],
  [/\baccounts?\s+receivable\b|\bA\/?R\b|\baged?\s+receivables?\b|\bageing\b/i, 10],
  [/\bcash[\s-]?flow\b/i, 5],
  [/\bnet[\s-]?(15|30|45|60)\b|\bpayment terms\b/i, 4],
  [/\bawkward\b.{0,40}\b(chas|ask|remind)/i, 6],
  [/\b(not|never|haven'?t|hasn'?t|didn'?t|won'?t|still)\b.{0,15}\b(been\s+)?(getting\s+)?paid\b|\b(didn'?t|won'?t|hasn'?t|haven'?t)\s+pay\b|\bowes?\s+me\b|\bpayment\s+(not\s+received|is\s+late|was\s+late|never\s+(came|arrived))/i, 12],
];

const ICP = [
  [/\b(bookkeep(er|ers|ing)|fractional (cfo|controller|accountant)|accountant|accounting (firm|practice))\b/i, 8],
  [/\b(quickbooks|qbo|xero)\b/i, 6],
  [/\b(agency|agencies|freelanc(er|ers|ing)|consultan(t|cy)|contractor|small business)\b/i, 4],
  [/\b(my clients|client books|several clients|multiple clients|\d+ clients)\b/i, 4],
];

// Things that mean "do not answer here".
const EXCLUDE = [
  ['validation', /\b(i('| a)?m building|i built|we built|launching|would you use|feedback on my|validat(e|ing)|market research|survey|looking for beta|early access|waitlist)\b/i],
  ['promo', /\b(check out my|use my (link|code)|referral (link|code)|dm me for|link in bio)\b/i],
  ['hiring', /\b(hiring|job opening|looking to hire)\b/i],
];
export const COMPETITORS = /\b(chaser|paidnice|chasd|upflow|gaviti|growfin|highradius|bill\.com|melio|freshbooks|zoho books)\b/i;
const OFF_TOPIC = /\b(failed card|chargeback|card declined|stripe payout|subscription (churn|failed))\b/i;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function ageDays(createdAt, now = new Date()) {
  const t = Date.parse(createdAt);
  return Number.isFinite(t) ? Math.max(0, (now.getTime() - t) / 86400000) : null;
}

/** Why an item must not be shown at all, or null. */
export function excludeReason(item, { now = new Date(), maxAgeDays = 7, activeWithinDays = 2 } = {}) {
  const text = `${item.title ?? ''} ${item.text ?? ''}`;
  if (item.locked) return 'locked or archived thread, cannot take a reply';
  const age = ageDays(item.createdAt, now);
  if (age === null) return 'no usable date';
  if (age > maxAgeDays) {
    // Agent briefs allow an older thread through when it has a reply within the last couple of days.
    const activeAge = item.lastActiveAt ? ageDays(item.lastActiveAt, now) : null;
    if (activeAge === null || activeAge > activeWithinDays) return `older than ${maxAgeDays} days`;
  }
  if (COMPETITORS.test(text) && /\b(i|we) (built|made|run|offer)|\bour (tool|app|product)\b|\bmy (tool|app|product)\b/i.test(text)) return 'competitor promoting a product';
  for (const [name, re] of EXCLUDE) if (re.test(text)) return name === 'validation' ? 'founder validating or launching a product' : name === 'promo' ? 'promotion' : 'hiring post';
  if (OFF_TOPIC.test(text) && !PAIN.slice(0, 5).some(([re]) => re.test(text))) return 'about card payments, not invoices';
  if (/\bkenya|nairobi\b/i.test(text)) return 'outside the US and UK market';
  if ((item.flags ?? []).includes('hostile')) return 'hostile thread';
  return null;
}

/** Score 0 to 100 with a breakdown so the report can say why. */
export function scoreItem(item, { now = new Date() } = {}) {
  const text = `${item.title ?? ''} ${item.text ?? ''}`;
  let relevance = 0;
  const hits = [];
  for (const [re, w] of PAIN) if (re.test(text)) { relevance += w; hits.push(re.source.slice(0, 24)); }
  relevance = clamp(relevance, 0, 50);

  let icp = 0;
  for (const [re, w] of ICP) if (re.test(text)) icp += w;
  icp = clamp(icp, 0, 20);

  // Engagement: a reply is worth most where people are reading but the thread is not already crowded.
  const c = Number(item.comments ?? 0);
  const s = Number(item.score ?? 0);
  let engagement = clamp(Math.log2(1 + Math.max(0, s)) * 1.2, 0, 6);
  engagement += c === 0 ? 1 : c <= 15 ? 4 : c <= 40 ? 2 : 0;
  engagement = clamp(engagement, 0, 10);

  const age = ageDays(item.createdAt, now) ?? 7;
  const recency = clamp(10 - age * 1.4, 0, 10);

  // A person asking beats a person venting beats a statement.
  const asking = /\?|\bhow (do|can|should)\b|\badvice\b|\banyone (else|know|using)\b|\bwhat do you\b|\bany tips?\b/i.test(text) ? 10 : 0;

  const total = Math.round(clamp(relevance + icp + engagement + recency + asking, 0, 100));
  return { total, relevance, icp, engagement: Math.round(engagement * 10) / 10, recency: Math.round(recency * 10) / 10, asking, competitorMentioned: COMPETITORS.test(text), hits };
}
