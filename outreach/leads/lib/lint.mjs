// Checks a drafted reply against the writing rules. Returns a list of problems (empty means fine).

const HYPE = /\b(seamless(ly)?|leverage[sd]?|game[\s-]?changer|delve|unlock|streamline[sd]?|robust|cutting[\s-]edge|revolutioni[sz]e|supercharge|elevate|tapestry|in today'?s (fast[\s-]paced )?world|I hope this helps)\b/i;

export function lintDraft(d, { platform = 'reddit' } = {}) {
  const out = [];
  const r = String(d?.reply ?? '');
  if (!r.trim()) return ['empty reply'];
  if (/[–—]/.test(r)) out.push('contains an em-dash or en-dash');
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|io|app|co|ai)\b/i.test(r.replace(/mugavi\.com/gi, ''))) out.push('contains a link or domain');
  if (/mugavi\.com/i.test(r)) out.push('contains the Mugavi link');
  if (HYPE.test(r)) out.push('hype or filler word');
  const max = platform === 'x' ? 280 : 900;
  if (r.length < 40) out.push('too short (under 40 characters)');
  if (r.length > max) out.push(`too long (${r.length} over ${max})`);
  if (/@\w+/.test(r)) out.push('contains an @handle');
  if (/\b[\w.+-]+@[\w-]+\.[\w.]+\b/.test(r)) out.push('contains an email address');
  const mentions = /\bmugavi\b/i.test(r);
  if (mentions && !d.mentionsMugavi) out.push('mentions Mugavi but mentionsMugavi is not set');
  if (d.mentionsMugavi && !String(d.mentionReason ?? '').trim()) out.push('mentions Mugavi without a mentionReason');
  if (d.mentionsMugavi && !mentions) out.push('mentionsMugavi is set but the reply does not name it');
  if (!String(d.painPoint ?? '').trim()) out.push('missing painPoint');
  return out;
}
