'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles } from 'lucide-react';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/playbook', label: 'Free playbook' },
  { href: '/tools/ar-roi', label: 'ROI calculator' },
  { href: '/contact', label: 'Contact' },
  { href: '/changelog', label: 'Changelog' },
];

const HIGHLIGHT_LINK = { href: '/ar-audit', label: 'Free A/R audit' };

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  // Close on route change / escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    // Lock scroll while menu open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-ink-950" onClick={() => setOpen(false)}>
          <Logo className="h-7 w-7" />
          <span className="text-lg">Collectly</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-ink-700">
          {NAV_LINKS.slice(0, 5).map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink-950">{l.label}</Link>
          ))}
          <Link href={HIGHLIGHT_LINK.href} className="hover:text-ink-950 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-600" />
            {HIGHLIGHT_LINK.label}
          </Link>
          {NAV_LINKS.slice(5).map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink-950">{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="hidden sm:inline-flex btn-ghost text-sm">Sign in</Link>
          <Link href="/sign-up" className="hidden sm:inline-flex">
            <Button size="sm">Start free</Button>
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 -mr-2 rounded-lg text-ink-700 hover:bg-ink-100"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 z-30 bg-ink-950/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden absolute inset-x-0 top-16 z-40 border-b border-ink-200 bg-white shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="container-page py-4 flex flex-col">
              {[...NAV_LINKS, HIGHLIGHT_LINK].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base text-ink-800 hover:text-ink-950 border-b border-ink-100 last:border-0"
                >
                  {l.label === HIGHLIGHT_LINK.label ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      {l.label}
                    </span>
                  ) : l.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/sign-in" onClick={() => setOpen(false)} className="btn-secondary text-center text-sm">
                  Sign in
                </Link>
                <Link href="/sign-up" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full">Start free</Button>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
