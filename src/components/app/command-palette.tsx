'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, CornerDownLeft, Plus, RefreshCw, CreditCard, FileText,
} from 'lucide-react';
import { NAV_GROUPS, UTILITY_NAV } from './nav';

type Command = {
  /** Stable key, so recents survive a label rename. */
  id: string;
  label: string;
  group: 'Go to' | 'Actions';
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  /** Extra terms that should match this command ("chase" → Send reminder). */
  aliases?: string[];
};

const ACTIONS: Command[] = [
  { id: 'new-invoice', label: 'New invoice', group: 'Actions', icon: Plus, href: '/dashboard/invoices/new', aliases: ['create', 'add', 'bill'] },
  { id: 'new-customer', label: 'New customer', group: 'Actions', icon: Plus, href: '/dashboard/customers/new', aliases: ['create', 'add', 'client'] },
  { id: 'overdue', label: 'Show overdue invoices', group: 'Actions', icon: FileText, href: '/dashboard/invoices?filter=overdue', aliases: ['late', 'chase', 'past due'] },
  { id: 'paid', label: 'Show paid invoices', group: 'Actions', icon: FileText, href: '/dashboard/invoices?filter=paid', aliases: ['settled'] },
  { id: 'sequence', label: 'Edit dunning sequence', group: 'Actions', icon: RefreshCw, href: '/dashboard/dunning/sequence', aliases: ['reminder', 'chase', 'steps', 'cadence'] },
  { id: 'connect', label: 'Connect an integration', group: 'Actions', icon: RefreshCw, href: '/dashboard/integrations', aliases: ['quickbooks', 'xero', 'stripe', 'sync'] },
  { id: 'billing', label: 'Billing and plan', group: 'Actions', icon: CreditCard, href: '/dashboard/billing', aliases: ['upgrade', 'invoice us', 'subscription', 'plan'] },
];

const DESTINATIONS: Command[] = [
  ...NAV_GROUPS.flatMap((g) =>
    g.items.flatMap((i) => [
      { id: `nav:${i.href}`, label: i.label, group: 'Go to' as const, icon: i.icon, href: i.href },
      ...(i.children ?? []).map((c) => ({
        id: `nav:${c.href}`, label: `${i.label} → ${c.label}`, group: 'Go to' as const, icon: i.icon, href: c.href,
      })),
    ]),
  ),
  ...UTILITY_NAV.map((i) => ({
    id: `nav:${i.href}`, label: i.label, group: 'Go to' as const, icon: i.icon, href: i.href,
  })),
];

const ALL: Command[] = [...DESTINATIONS, ...ACTIONS];

/** Subsequence match, so "sq" finds "Sequence" and "ovinv" finds "Overdue invoices". */
function fuzzy(haystack: string, needle: string): boolean {
  if (!needle) return true;
  let i = 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  for (const ch of h) if (ch === n[i]) i++;
  return i === n.length;
}

/**
 * ⌘K palette. Worth building here because the ICP is keyboard-comfortable and
 * the app has 9 destinations plus a dozen repeated actions.
 *
 * Deliberately the ONLY search surface: the header used to render a magnifier
 * button wired to nothing at all, which is worse than no affordance. That
 * button now opens this, so there is one search system rather than a dead one
 * beside a real one. Free-text that matches no command falls through to a real
 * invoice search, so typing a customer name is never a dead end.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [entered, setEntered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim();
    const matched = ALL.filter(
      (c) => fuzzy(c.label, q) || (c.aliases ?? []).some((a) => fuzzy(a, q)),
    );
    if (!q) return matched;
    // Always offer the literal search as a last row, so a customer or invoice
    // number that matches no command still leads somewhere useful.
    return [
      ...matched,
      {
        id: 'search', group: 'Actions' as const, icon: Search,
        label: `Search invoices for “${q}”`,
        href: `/dashboard/invoices?q=${encodeURIComponent(q)}`,
      },
    ];
  }, [query]);

  const run = useCallback(
    (cmd: Command) => { onClose(); router.push(cmd.href); },
    [onClose, router],
  );

  // Reset and take focus on open; restore focus to the opener on close, so
  // keyboard users are not dumped at the top of the document.
  useEffect(() => {
    if (open) {
      restoreTo.current = document.activeElement as HTMLElement | null;
      setQuery('');
      setCursor(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    restoreTo.current?.focus?.();
  }, [open]);

  // Entry transition. A palette that appears fully formed reads as a static
  // screenshot; 130ms of settle tells the eye it flew in over the page. Driven
  // off a state flip one frame after mount rather than a keyframe, so the
  // component owns its own motion and reduced-motion users get none of it.
  useEffect(() => {
    if (!open) { setEntered(false); return; }
    const r = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(r);
  }, [open]);

  // Scroll-lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = results[cursor];
        if (cmd) run(cmd);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, results, cursor, onClose, run]);

  // Keep the highlighted row in view during arrow navigation.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[11vh]">
      {/* The scrim is darker and genuinely blurred. A 2px blur over a 40% wash
          left the page behind legible enough to compete for attention; pushing
          it out of focus is what makes the palette the only live surface. */}
      <div
        className={`absolute inset-0 bg-ink-950/45 backdrop-blur-[3px] transition-opacity duration-150 motion-reduce:transition-none ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={`relative w-full max-w-[600px] overflow-hidden rounded-[14px] border bg-white transition-all duration-150 ease-out motion-reduce:transition-none ${
          entered ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-1 scale-[0.985] opacity-0'
        } border-hair lift-4`}
      >
        {/* An accent hairline along the top edge, the same one-pixel device
            `.card-primary` uses to mark the surface that owns the moment. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgb(var(--brand-500) / 0.5) 20%, rgb(var(--brand-400) / 0.8) 50%, rgb(var(--brand-500) / 0.5) 80%, transparent)',
          }}
        />

        {/* Query row. Taller than a form field and undecorated — the whole
            surface is the input, so a second box drawn inside it would only
            repeat the frame that is already there. */}
        <div
          className="flex items-center gap-3 border-b border-hair px-4"
         
        >
          <Search className="h-[17px] w-[17px] shrink-0 text-ink-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to…"
            aria-label="Search commands"
            aria-controls="command-results"
            className="h-[52px] w-full bg-transparent text-[15px] tracking-[-0.01em] text-ink-950 placeholder:text-ink-400 focus:outline-none"
          />
          <kbd className="kbd shrink-0">Esc</kbd>
        </div>

        <div id="command-results" ref={listRef} role="listbox" aria-label="Results" className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-[13px] text-ink-500">No matches.</p>
          )}
          {results.map((cmd, i) => {
            const header = cmd.group !== lastGroup ? ((lastGroup = cmd.group), cmd.group) : null;
            const Icon = cmd.icon;
            const active = i === cursor;
            return (
              <div key={cmd.id}>
                {/* Group headers stick to the top of the scroller, so a long
                    result list never leaves the reader without a heading. */}
                {header && (
                  <div className="sticky top-0 z-10 -mx-1.5 bg-white/90 px-4 pb-1.5 pt-2.5 text-2xs font-medium uppercase tracking-[0.08em] text-ink-400 backdrop-blur-sm">
                    {header}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  onMouseMove={() => setCursor(i)}
                  onClick={() => run(cmd)}
                  className={`relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors ${
                    active
                      ? 'bg-brand-50 text-ink-950 ring-1 ring-inset ring-brand-500/15'
                      : 'text-ink-700 hover:bg-ink-100/80'
                  }`}
                >
                  {/* Same lit rail as the sidebar's active item: one language
                      for "this is the thing you are on" across the app. */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand-600"
                    />
                  )}
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand-600' : 'text-ink-400'}`} />
                  <span className="flex-1 truncate">{cmd.label}</span>
                  {/* The hint names the key rather than drawing a bare glyph,
                      which is what turns an icon into an instruction. */}
                  {active && (
                    <span className="flex shrink-0 items-center gap-1 text-2xs font-medium text-ink-500">
                      <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
                      Enter
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between gap-3 border-t border-hair bg-ink-50 px-4 py-2 text-2xs text-ink-500"
         
        >
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> open</span>
          </span>
          {/* Result count closes the loop on typing: the list is already
              filtering, and saying how much is left is what makes it feel
              responsive rather than merely animated. */}
          <span className="tabular-nums" aria-live="polite">
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Global ⌘K / Ctrl-K listener, kept out of the palette so it costs nothing while closed. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o); // same chord closes it again
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return { open, setOpen };
}
