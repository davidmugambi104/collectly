'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown } from 'lucide-react';

/**
 * Header laid out the way every competitor's is (Chaser, Paidnice, Upflow,
 * Invoiced), on purpose. Someone comparing AR tools has already learned that
 * pattern: logo left, a handful of top-level links with a Resources menu for
 * everything else, then "Sign in", a quiet secondary button and one filled
 * primary. Reproducing it means they don't have to learn ours.
 *
 * What changed from before: "Founder" and "Contact" moved into the Resources
 * menu (under About and Contact) instead of sitting in the bar, "Demo" became
 * the secondary button, and the sparkle on Contact is gone.
 */
const PRIMARY_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/compare', label: 'Compare' },
];

const RESOURCE_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/playbook', label: 'A/R playbook' },
  { href: '/tools/ar-cost-calculator', label: 'Late-payment cost calculator' },
  { href: '/ar-audit', label: 'Free A/R audit' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/about', label: 'About the founder' },
  { href: '/contact', label: 'Contact' },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);

  // Mobile drawer: close on Escape, lock scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Resources menu: close on Escape, on a click outside, or when focus leaves.
  useEffect(() => {
    if (!resourcesOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setResourcesOpen(false);
    const onPointer = (e: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) setResourcesOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [resourcesOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-ink-950 transition-opacity hover:opacity-70" onClick={() => setOpen(false)}>
          <Logo className="h-7 w-7" />
          <span className="text-lg">Mugavi</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-ink-700" aria-label="Main">
          {PRIMARY_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink-950">{l.label}</Link>
          ))}

          <div
            ref={resourcesRef}
            className="relative"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setResourcesOpen(false);
            }}
          >
            <button
              type="button"
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              aria-controls="resources-menu"
              onClick={() => setResourcesOpen((v) => !v)}
              className="inline-flex items-center gap-1 hover:text-ink-950"
            >
              Resources
              <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
            </button>
            {resourcesOpen && (
              <ul
                id="resources-menu"
                className="absolute left-1/2 top-full z-50 mt-3 w-64 -translate-x-1/2 rounded-2xl border border-ink-200 bg-white p-2 shadow-lg"
              >
                {RESOURCE_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setResourcesOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-ink-800 hover:bg-ink-50 hover:text-ink-950"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="hidden md:inline-flex btn-ghost text-sm">Sign in</Link>
          <Link href="/tour" className="hidden lg:inline-flex btn-secondary text-sm">See the demo</Link>
          <Link href="/sign-up" className="hidden sm:inline-flex">
            <Button size="sm">Start free trial</Button>
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
            <nav className="container-page py-4 flex flex-col" aria-label="Mobile">
              {PRIMARY_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base text-ink-800 hover:text-ink-950 border-b border-ink-100"
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/tour" onClick={() => setOpen(false)} className="py-3 text-base text-ink-800 hover:text-ink-950 border-b border-ink-100">
                See the demo
              </Link>
              <p className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-500">Resources</p>
              {RESOURCE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-2.5 text-base text-ink-700 hover:text-ink-950"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/sign-in" onClick={() => setOpen(false)} className="btn-secondary text-center text-sm">
                  Sign in
                </Link>
                <Link href="/sign-up" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full">Start free trial</Button>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
