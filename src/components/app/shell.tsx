import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { ArrowUpRight, Bell, Search } from 'lucide-react';

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen flex bg-ink-50">
      <aside className="hidden md:flex w-60 flex-col border-r border-ink-200 bg-white">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-200">
          <Logo className="h-7 w-7" /><span className="font-display font-bold text-ink-950">Collectly</span>
        </Link>
        <nav className="flex-1 p-3 space-y-0.5 text-sm">
          {[
            { href: '/dashboard', label: 'Overview' },
            { href: '/dashboard/invoices', label: 'Invoices' },
            { href: '/dashboard/customers', label: 'Customers' },
            { href: '/dashboard/dunning', label: 'Dunning' },
            { href: '/dashboard/cash-flow', label: 'Cash flow' },
            { href: '/dashboard/events', label: 'Activity' },
            { href: '/dashboard/payments', label: 'Payments' },
            { href: '/dashboard/integrations', label: 'Integrations' },
            { href: '/dashboard/settings', label: 'Settings' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-700 hover:bg-ink-100 hover:text-ink-900 transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="m-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div className="text-xs font-semibold text-brand-900">Trial · 13 days left</div>
          <p className="mt-1 text-xs text-brand-800">Upgrade to keep unlimited invoices & SMS dunning.</p>
          <Link href="/dashboard/billing" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
            Upgrade <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-5 sm:px-8 border-b border-ink-200 bg-white">
          <div>
            <h1 className="text-lg font-display font-semibold text-ink-950">{title}</h1>
            {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100 text-ink-600">
              <Search className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100 text-ink-600 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="flex-1 p-5 sm:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
