'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/brand/logo';
import { Search, Menu, X, ArrowUpRight } from 'lucide-react';
import { NAV_GROUPS, UTILITY_NAV, isActive, type NavItem } from './nav';
import { useWorkspace } from './workspace-context';
import { CommandPalette, useCommandPalette } from './command-palette';

// Clerk components are imported dynamically to avoid 'missing ClerkProvider'
// errors when USE_DEV_AUTH=1 (the dev shim has no provider in the tree).
const UserButton = dynamic(() => import('@clerk/nextjs').then((m) => m.UserButton), { ssr: false });
const OrganizationSwitcher = dynamic(() => import('@clerk/nextjs').then((m) => m.OrganizationSwitcher), { ssr: false });

// In a client component only NEXT_PUBLIC_* vars are inlined at build time.
const hasClerk =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_USE_DEV_AUTH !== '1';

/* ------------------------------------------------------------------ */
/* Nav rendering — one implementation, used by sidebar and drawer alike */

function NavLink({
  item, pathname, unreadCount, dense,
}: {
  item: NavItem; pathname: string | null; unreadCount: number; dense?: boolean;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors ${
          dense ? 'h-10' : 'h-8'
        } ${
          active
            // Active lifts to the content surface (white) against the dimmer
            // sidebar, rather than being washed in accent colour.
            ? 'bg-white font-medium text-ink-950 shadow-[0_1px_2px_rgba(15,14,13,0.05)]'
            : 'text-ink-600 hover:bg-ink-200/50 hover:text-ink-900'
        }`}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-brand-600"
          />
        )}
        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'}`} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.showUnread && unreadCount > 0 && (
          <span className="shrink-0 rounded bg-brand-600 px-1.5 py-0.5 text-2xs font-medium tabular-nums text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Second level, revealed only while its parent section is active. */}
      {active && item.children && (
        <div className="mt-0.5 space-y-0.5 pl-[26px]">
          {item.children.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={childActive ? 'page' : undefined}
                className={`flex items-center rounded-md px-2.5 text-[13px] transition-colors ${
                  dense ? 'h-9' : 'h-7'
                } ${childActive ? 'font-medium text-brand-700' : 'text-ink-500 hover:text-ink-900'}`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function NavTree({ pathname, unreadCount, dense }: { pathname: string | null; unreadCount: number; dense?: boolean }) {
  return (
    <>
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label ?? `g${gi}`} className={gi === 0 ? '' : 'pt-3'}>
          {group.label && (
            <div className="px-2.5 pb-1 pt-1 text-2xs font-medium uppercase tracking-wide text-ink-400">
              {group.label}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} unreadCount={unreadCount} dense={dense} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Trial state as a meter, driven by real subscription data. */
function TrialMeter() {
  const { isTrialing, trialDaysLeft, trialTotalDays, plan } = useWorkspace();

  if (!isTrialing) {
    return (
      <Link
        href="/dashboard/billing"
        className="flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] text-ink-600 transition-colors hover:bg-ink-200/50 hover:text-ink-900"
      >
        <span className="truncate capitalize">{plan ?? 'Billing'}</span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />
      </Link>
    );
  }

  const used = Math.max(0, trialTotalDays - trialDaysLeft);
  const pct = Math.min(100, Math.round((used / Math.max(1, trialTotalDays)) * 100));
  const urgent = trialDaysLeft <= 5;

  return (
    <div className="px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xs font-medium text-ink-600 tabular-nums">
          {trialDaysLeft} of {trialTotalDays} days left
        </span>
        <Link href="/dashboard/billing" className="text-2xs font-medium text-brand-600 hover:text-brand-700">
          Upgrade
        </Link>
      </div>
      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-ink-200">
        <div
          className={`h-full rounded-full transition-all ${urgent ? 'bg-warn-500' : 'bg-brand-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function AppShell({
  children, title, subtitle,
}: {
  children: React.ReactNode; title: string; subtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { orgName, unreadCount } = useWorkspace();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  useEffect(() => { setOpen(false); }, [pathname]);

  // ESC + scroll lock for the mobile drawer.
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
    <div className="flex min-h-screen bg-ink-50">
      {/* Keyboard users previously had to tab through the entire sidebar on
          every navigation to reach the page they had just opened. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-ink-900 focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      {/* Sidebar — deliberately one lightness step dimmer than the canvas, so
          the content area a user is actually working in stays the brightest
          thing on screen. */}
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-ink-200 bg-ink-100 md:flex">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-ink-950">Collectly</span>
          </Link>
        </div>

        {/* Org switching belongs beside the workspace it switches, not buried
            in the header's top-right corner where template dashboards put it. */}
        {hasClerk ? (
          <div className="px-3 pb-2">
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
          </div>
        ) : orgName ? (
          <div className="px-3 pb-2">
            <div className="flex h-9 items-center gap-2 rounded-md border border-ink-200 bg-white px-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-600 text-2xs font-semibold text-white">
                {orgName.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate text-[13px] font-medium text-ink-900">{orgName}</span>
            </div>
          </div>
        ) : null}

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-2">
          <NavTree pathname={pathname} unreadCount={unreadCount} />
        </nav>

        <div className="border-t border-ink-200 px-3 py-2">
          <div className="space-y-0.5">
            {UTILITY_NAV.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} unreadCount={unreadCount} />
            ))}
          </div>
          <div className="mt-1 border-t border-ink-200 pt-1">
            <TrialMeter />
          </div>
          {hasClerk && (
            <div className="mt-1 flex items-center gap-2 px-2.5 py-1.5">
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen(!open)}
              className="-ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-600 hover:bg-ink-100 md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {/* The bar carries chrome only. The page title used to live here,
                where a 20px heading and an 11px subtitle had to fit inside 56px
                next to the search box — so the most important text on the page
                was also the most cramped. It now heads the content column. */}
            <div className="min-w-0 md:hidden">
              <span className="truncate text-[14px] font-semibold text-ink-950">{title}</span>
            </div>
          </div>

          {/* An input-shaped button rather than a bare magnifier: it advertises
              the shortcut and opens the one real search surface. The bell that
              used to sit here was wired to nothing and showed a permanent
              unread dot, so it has been removed until notifications exist —
              the live unread count now rides on the Inbox nav item instead. */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-ink-200 bg-ink-50 px-2.5 text-[13px] text-ink-400 transition-colors hover:border-ink-300 hover:text-ink-600 sm:w-60"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden flex-1 text-left sm:inline">Search…</span>
            <kbd className="kbd hidden sm:inline-flex">⌘K</kbd>
          </button>
        </header>

        {/* The content column was unconstrained, so on a wide monitor tables and
            the 5-up stat grid stretched to the full viewport and line lengths
            ran past readable. 1440px holds the 5-up grid at a sensible tile
            width and keeps long text measured. */}
        <main id="main" className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6">
            <div className="mb-5 hidden md:block">
              <h1 className="app-title">{title}</h1>
              {subtitle && <p className="app-body mt-0.5 text-ink-500">{subtitle}</p>}
            </div>
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 top-14 z-30 bg-ink-950/30 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 top-14 z-40 w-72 max-w-[85vw] overflow-y-auto border-r border-ink-200 bg-ink-100 shadow-xl md:hidden"
          >
            <nav aria-label="Primary" className="px-3 py-3">
              <NavTree pathname={pathname} unreadCount={unreadCount} dense />
            </nav>
            <div className="border-t border-ink-200 px-3 py-2">
              <div className="space-y-0.5">
                {UTILITY_NAV.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} unreadCount={unreadCount} dense />
                ))}
              </div>
              <div className="mt-1 border-t border-ink-200 pt-1">
                <TrialMeter />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
