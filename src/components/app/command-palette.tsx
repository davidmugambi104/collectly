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
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-ink-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-ink-200 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to…"
            aria-label="Search commands"
            aria-controls="command-results"
            className="h-12 w-full bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          <kbd className="kbd shrink-0">Esc</kbd>
        </div>

        <div id="command-results" ref={listRef} role="listbox" aria-label="Results" className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-ink-500">No matches.</p>
          )}
          {results.map((cmd, i) => {
            const header = cmd.group !== lastGroup ? ((lastGroup = cmd.group), cmd.group) : null;
            const Icon = cmd.icon;
            const active = i === cursor;
            return (
              <div key={cmd.id}>
                {header && (
                  <div className="px-2.5 pb-1 pt-3 text-2xs font-medium uppercase tracking-wide text-ink-400">
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
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                    active ? 'bg-brand-50 text-ink-950' : 'text-ink-700 hover:bg-ink-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand-600' : 'text-ink-400'}`} />
                  <span className="flex-1 truncate">{cmd.label}</span>
                  {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-ink-200 bg-ink-50 px-4 py-2 text-2xs text-ink-500">
          <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> open</span>
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
