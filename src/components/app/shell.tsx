'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { ArrowUpRight, Bell, Search, Menu, X } from 'lucide-react';

// Clerk components are imported dynamically below to avoid 'missing
// ClerkProvider' errors when USE_DEV_AUTH=1 (dev shim has no Clerk
// provider in the tree). The original server-component version
// could reference Clerk's exports at module top-level because they
// never ran in the browser; a client component must defer.
import dynamic from 'next/dynamic';
const UserButton = dynamic(() => import('@clerk/nextjs').then(m => m.UserButton), { ssr: false });
const OrganizationSwitcher = dynamic(() => import('@clerk/nextjs').then(m => m.OrganizationSwitcher), { ssr: false });

// Skip Clerk components when dev shim is on — they'd throw at runtime
// because there's no <ClerkProvider> wrapping them.
// In a client component, only NEXT_PUBLIC_* env vars are inlined at build time.
const hasClerk =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_USE_DEV_AUTH !== '1';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/invoices', label: 'Invoices' },
  { href: '/dashboard/customers', label: 'Customers' },
  { href: '/dashboard/inbox', label: 'Inbox' },
  { href: '/dashboard/dunning', label: 'Dunning' },
  { href: '/dashboard/cash-flow', label: 'Cash flow' },
  { href: '/dashboard/events', label: 'Activity' },
  { href: '/dashboard/admin/interviews', label: 'Interviews' },
  { href: '/dashboard/payments', label: 'Payments' },
  { href: '/dashboard/integrations', label: 'Integrations' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC + scroll lock
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

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-60 flex-col border-r border-ink-200 bg-white">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-200">
          <Logo className="h-7 w-7" /><span className="font-display font-bold text-ink-950">Collectly</span>
        </Link>
        <nav className="flex-1 p-3 space-y-0.5 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                  active ? 'bg-brand-50 text-brand-900 font-medium' : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div className="text-xs font-semibold text-brand-900">Trial · 13 days left</div>
          <p className="mt-1 text-xs text-brand-800">Upgrade to keep unlimited invoices & SMS dunning.</p>
          <Link href="/dashboard/billing" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
            Upgrade <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between gap-2 px-4 sm:px-8 border-b border-ink-200 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="md:hidden inline-flex items-center justify-center h-10 w-10 -ml-2 rounded-lg text-ink-700 hover:bg-ink-100 shrink-0"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-display font-semibold text-ink-950 truncate">{title}</h1>
              {subtitle && <p className="text-xs text-ink-500 truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100 text-ink-600 hidden sm:grid" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100 text-ink-600 relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            {hasClerk && (
              <>
                <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
                <UserButton afterSignOutUrl="/" />
              </>
            )}
            {!hasClerk && (
              <div className="flex items-center gap-2 text-sm text-ink-700">
                <div className="h-8 w-8 rounded-full bg-ink-200 grid place-items-center text-ink-700 text-xs font-semibold">D</div>
                <span className="hidden sm:inline">Davie</span>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">{children}</main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 z-30 bg-ink-950/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed inset-y-0 left-0 top-16 z-40 w-72 max-w-[85vw] bg-white border-r border-ink-200 shadow-xl overflow-y-auto">
            <nav className="p-3 space-y-0.5 text-sm">
              {NAV.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-3 transition-colors ${
                      active ? 'bg-brand-50 text-brand-900 font-medium' : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="m-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <div className="text-xs font-semibold text-brand-900">Trial · 13 days left</div>
              <p className="mt-1 text-xs text-brand-800">Upgrade to keep unlimited invoices & SMS dunning.</p>
              <Link href="/dashboard/billing" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
                Upgrade <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
