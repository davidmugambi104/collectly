'use client';

/**
 * Spam trap for the public lead forms. People never see or reach it (off
 * screen, out of the tab order, hidden from screen readers); a bot that fills
 * every field fills it, and the route then discards the submission. See
 * isHoneypotHit in src/lib/lead-guard.ts.
 *
 * The input is deliberately NOT named "website" or "url": Chrome autofill fills those from the
 * visitor's address profile, which would discard a real lead as spam. The JSON key the forms send
 * is still `website`; autofill never sees that.
 */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
      <label>
        Leave this field empty
        <input type="text" name="hp_check_7" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
