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
        className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-all duration-150 ${
          dense ? 'h-10' : 'h-8'
        } ${
          active
            // Active is the one surface in the rail that obeys the app's light
            // model: it lifts off the dim ground (catchlight + shadow) and
            // bleeds a few percent of accent in from its left edge, where the
            // rail sits. A flat background swap — which this was — gives the
            // eye no reason to read "in front", only "different colour".
            ? 'font-medium text-ink-950'
            : 'text-ink-600 hover:bg-white/60 hover:text-ink-900'
        }`}
        style={
          active
            ? {
                background: 'linear-gradient(90deg, rgb(var(--brand-500) / 0.10) 0%, rgb(255 255 255) 38%)',
                boxShadow: 'var(--catch), var(--lift-1)',
              }
            : undefined
        }
      >
        {active && (
          // The rail reads as a lit edge on the pill rather than a plain bar:
          // the glow is what keeps 2px legible against a white surface.
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full bg-brand-600 shadow-[0_0_6px_0_rgb(var(--brand-500)/0.6)]"
          />
        )}
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'
          }`}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {item.showUnread && unreadCount > 0 && (
          <span
            className="shrink-0 min-w-[18px] rounded-full bg-brand-600 px-1.5 text-center text-2xs font-medium leading-[17px] tabular-nums text-white"
            style={{ boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.22), 0 1px 2px -1px rgb(var(--brand-700) / 0.6)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Second level, revealed only while its parent section is active. A
          hairline guide down the left ties the children to their parent, so the
          indent is explained rather than merely implied. */}
      {active && item.children && (
        <div
          className="mt-1 ml-[27px] space-y-0.5 border-l pl-3"
         
        >
          {item.children.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={childActive ? 'page' : undefined}
                className={`relative flex items-center rounded-md px-2 text-[13px] transition-colors ${
                  dense ? 'h-9' : 'h-7'
                } ${childActive ? 'font-medium text-brand-700' : 'text-ink-500 hover:bg-white/60 hover:text-ink-900'}`}
              >
                {childActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -left-[13px] top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-brand-500"
                  />
                )}
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
        <div key={group.label ?? `g${gi}`} className={gi === 0 ? '' : 'pt-4'}>
          {/* Cluster labels sit at the quietest step in the rail: wide tracking
              at small size reads as a signpost, not as another link. */}
          {group.label && (
            <div className="px-2.5 pb-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-ink-400">
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
        className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-ink-600 transition-colors hover:bg-white/60 hover:text-ink-900"
      >
        <span className="truncate capitalize">{plan ?? 'Billing'}</span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-ink-600" />
      </Link>
    );
  }

  const used = Math.max(0, trialTotalDays - trialDaysLeft);
  const pct = Math.min(100, Math.round((used / Math.max(1, trialTotalDays)) * 100));
  const urgent = trialDaysLeft <= 5;

  return (
    <div className="px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xs font-medium tabular-nums text-ink-600">
          {trialDaysLeft} of {trialTotalDays} days left
        </span>
        <Link href="/dashboard/billing" className="text-2xs font-medium text-brand-600 hover:text-brand-700">
          Upgrade
        </Link>
      </div>
      {/* The track is recessed and the fill lit, the same inverse-surface rule
          the app uses for inputs — a flat grey bar with a flat coloured bar
          inside it is the shape of a progress meter without the material. The
          figure above already states the value, so the bar stays decorative. */}
      <div
        aria-hidden="true"
        className="mt-2 h-1 overflow-hidden rounded-full bg-ink-200"
        style={{ boxShadow: 'inset 0 1px 1px 0 rgb(var(--shade) / 0.10)' }}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${urgent ? 'bg-warn-500' : 'bg-brand-600'}`}
          style={{ width: `${pct}%`, boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.3)' }}
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

      {/* Sidebar — one lightness step dimmer than the canvas, so the content
          area a user is actually working in stays the brightest thing on
          screen. Two refinements over a flat fill: it settles very slightly
          darker at the foot (a ground shadow, so the rail reads as receding
          rather than as a grey rectangle), and its inner right edge carries a
          catchlight, which turns the border into a bevel between two planes.
          It is also its own scroll container pinned to the viewport, so the
          workspace and utility zones never drift off on a long page. */}
      <aside
        className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r md:flex"
        style={{
          borderColor: 'var(--hair)',
          background:
            'linear-gradient(180deg, rgb(var(--ink-100)) 0%, rgb(var(--ink-100)) 62%, rgb(var(--ink-200) / 0.7) 100%)',
          boxShadow: 'inset -1px 0 0 0 rgb(255 255 255 / 0.5)',
        }}
      >
        <div className="flex h-14 shrink-0 items-center px-3.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-0.5 py-1 text-[14px] font-semibold tracking-[-0.01em] text-ink-950"
          >
            <Logo className="h-6 w-6" />
            <span>Mugavi</span>
          </Link>
        </div>

        {/* Org switching belongs beside the workspace it switches, not buried
            in the header's top-right corner where template dashboards put it.
            The plate is a lifted white surface: it is the identity of
            everything below it, so it sits one plane forward of the rail. */}
        {hasClerk ? (
          <div className="px-3 pb-3">
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
          </div>
        ) : orgName ? (
          <div className="px-3 pb-3">
            <div
              className="flex h-9 items-center gap-2.5 rounded-[10px] border bg-white px-2"
              style={{ borderColor: 'var(--hair)', boxShadow: 'var(--catch), var(--lift-1)' }}
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-brand-600 text-2xs font-semibold text-white"
                style={{ boxShadow: 'inset 0 1px 0 0 rgb(255 255 255 / 0.28), 0 1px 3px -1px rgb(var(--brand-700) / 0.55)' }}
              >
                {orgName.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate text-[13px] font-medium text-ink-900">{orgName}</span>
            </div>
          </div>
        ) : null}

        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-3">
          <NavTree pathname={pathname} unreadCount={unreadCount} />
        </nav>

        <div className="shrink-0 border-t border-hair px-3 py-2">
          <div className="space-y-0.5">
            {UTILITY_NAV.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} unreadCount={unreadCount} />
            ))}
          </div>
          <div className="mt-1.5 border-t border-hair pt-1">
            <TrialMeter />
          </div>
          {hasClerk && (
            <div className="mt-1 flex items-center gap-2 px-2 py-1.5">
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky and translucent: the chrome stays reachable on a long table,
            and blurring what passes beneath it is what tells the eye the bar is
            a pane of glass in front of the page rather than a band drawn on
            it. Opaque fallback first, so the blur is purely additive. */}
        <header
          className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-hair bg-white px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 sm:px-6"
         
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen(!open)}
              className="-ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200/70 md:hidden"
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
              the shortcut and opens the one real search surface. It is drawn
              recessed, matching `.app .input`, because it makes a promise about
              typing — controls that raise are ones you press. The bell that used
              to sit here was wired to nothing and showed a permanent unread dot,
              so it has been removed until notifications exist — the live unread
              count now rides on the Inbox nav item instead. */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group flex h-8 shrink-0 items-center gap-2 rounded-lg bg-ink-50 px-2.5 text-[13px] text-ink-400 ring-1 ring-inset ring-ink-300/55 transition-colors hover:bg-white hover:text-ink-600 hover:ring-ink-300 sm:w-64"
            style={{ boxShadow: 'inset 0 1px 2px 0 rgb(var(--shade) / 0.05)' }}
          >
            <Search className="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-ink-500" />
            <span className="hidden flex-1 text-left sm:inline">Search…</span>
            <kbd className="kbd hidden sm:inline-flex">⌘K</kbd>
          </button>
        </header>

        {/* The content column was unconstrained, so on a wide monitor tables and
            the 5-up stat grid stretched to the full viewport and line lengths
            ran past readable. 1440px holds the 5-up grid at a sensible tile
            width and keeps long text measured. */}
        <main id="main" className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7">
            <div className="mb-6 hidden md:block">
              <h1 className="app-title">{title}</h1>
              {/* Measured to ~80 characters: a subtitle running the full 1440px
                  column is a line the eye cannot track back from. */}
              {subtitle && <p className="app-body mt-1 max-w-[78ch] text-ink-500">{subtitle}</p>}
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
            className="fixed inset-0 top-14 z-30 bg-ink-950/40 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 top-14 z-40 w-72 max-w-[85vw] overflow-y-auto border-r bg-ink-100 md:hidden"
            style={{ borderColor: 'var(--hair)', boxShadow: 'var(--lift-4)' }}
          >
            <nav aria-label="Primary" className="px-3 py-3">
              <NavTree pathname={pathname} unreadCount={unreadCount} dense />
            </nav>
            <div className="border-t border-hair px-3 py-2">
              <div className="space-y-0.5">
                {UTILITY_NAV.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} unreadCount={unreadCount} dense />
                ))}
              </div>
              <div className="mt-1.5 border-t border-hair pt-1">
                <TrialMeter />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
