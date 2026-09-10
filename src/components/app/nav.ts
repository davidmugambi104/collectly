import {
  LayoutDashboard, Inbox, FileText, Building2, ArrowDownToLine,
  Send, TrendingUp, History, Plug, Settings, type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Render the live unread-inbox count as a trailing pill. */
  showUnread?: boolean;
  /** Sub-destinations, revealed only while this section is active. */
  children?: { href: string; label: string }[];
};

export type NavGroup = { label?: string; items: NavItem[] };

/**
 * Primary navigation, defined once and rendered by both the desktop sidebar
 * and the mobile drawer. Those two previously held byte-identical copies of
 * the nav map, the active-state expression and the trial card, so every nav
 * change had to be made twice and could silently drift.
 *
 * Structure follows the "two levels maximum" rule: eleven flat, undifferentiated
 * links became seven primary destinations in three labelled clusters, plus a
 * dimmer utility zone. Ordering reflects the actual AR loop — see what is owed
 * (Overview), read what customers said (Inbox), then work the ledger.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox, showUnread: true },
    ],
  },
  {
    label: 'Receivables',
    items: [
      { href: '/dashboard/invoices', label: 'Invoices', icon: FileText },
      { href: '/dashboard/customers', label: 'Customers', icon: Building2 },
      { href: '/dashboard/payments', label: 'Payments', icon: ArrowDownToLine },
    ],
  },
  {
    label: 'Collections',
    items: [
      {
        href: '/dashboard/dunning',
        label: 'Dunning',
        icon: Send,
        // Both already exist as routes but were reachable only by stumbling
        // across an inline link on the Dunning page.
        children: [
          { href: '/dashboard/dunning/sequence', label: 'Sequence' },
          { href: '/dashboard/dunning/performance', label: 'Performance' },
        ],
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/dashboard/cash-flow', label: 'Cash flow', icon: TrendingUp },
      { href: '/dashboard/events', label: 'Activity', icon: History },
    ],
  },
];

/**
 * Pinned to the bottom, one step dimmer. Integrations earns a top-level slot
 * because connecting QuickBooks or Xero is the activation event for a trial.
 *
 * Deliberately absent: "Interviews" (`/dashboard/admin/interviews`), an internal
 * founder research tool that was sitting in customer-facing nav for every
 * signed-in user — it is now admin-gated and reachable by URL only. Billing is
 * also absent by design; it hangs off the trial meter and Settings instead.
 */
export const UTILITY_NAV: NavItem[] = [
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

/**
 * Active-state test, shared by both renderers.
 *
 * Anchored with a trailing-slash check so a future sibling sharing a prefix
 * (say /dashboard/invoices-archive) cannot light up /dashboard/invoices, which
 * the old bare `startsWith` would have done.
 */
export function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}
