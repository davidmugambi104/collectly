import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function MarketingFooter() {
  return (
    <footer className="mt-32 border-t border-ink-200 bg-ink-50">
      <div className="container-page py-14">
        {/* Brand block + a nested grid for the five link groups. The previous
            single md:grid-cols-6 grid held seven columns of content (the brand
            block spanned 2, plus five link groups), so "Legal" was pushed onto
            a second row on its own with a large gap above it. Nesting keeps the
            link groups balanced at every breakpoint. */}
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-ink-950">
              <Logo className="h-7 w-7" />
              <span>Collectly</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-ink-600">Honest AR automation for 5-30 person agencies and consultancies on Xero. Built in Nairobi.</p>
            <div className="mt-5 inline-flex flex-wrap gap-2 text-xs text-ink-500">
              <span className="rounded-md border border-ink-200 bg-white px-2 py-1">US · UK · EU · AU · CA · KE · NG</span>
              <span className="rounded-md border border-ink-200 bg-white px-2 py-1">5–30 person teams</span>
              <span className="rounded-md border border-ink-200 bg-white px-2 py-1">Xero (QuickBooks beta)</span>
            </div>
            <p className="mt-6 text-xs text-ink-500">© 2026 Collectly, Inc. · Built in Nairobi.</p>
          </div>
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Product</h2>
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                <li><Link href="/tour" className="inline-block py-1.5 hover:text-ink-900">Demo</Link></li>
                <li><Link href="/features" className="inline-block py-1.5 hover:text-ink-900">Features</Link></li>
                <li><Link href="/pricing" className="inline-block py-1.5 hover:text-ink-900">Pricing</Link></li>
                <li><Link href="/integrations" className="inline-block py-1.5 hover:text-ink-900">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Free tools</h2>
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                <li><Link href="/tools/ar-cost-calculator" className="inline-block py-1.5 hover:text-ink-900">Late-payment cost calculator</Link></li>
                <li><Link href="/ar-audit" className="inline-block py-1.5 hover:text-ink-900">Free A/R audit</Link></li>
                <li><Link href="/compare" className="inline-block py-1.5 hover:text-ink-900">Compare to competitors</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Compare</h2>
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                <li><Link href="/vs-chaser" className="inline-block py-1.5 hover:text-ink-900">vs Chaser</Link></li>
                <li><Link href="/vs-bill" className="inline-block py-1.5 hover:text-ink-900">vs BILL</Link></li>
                <li><Link href="/vs-melio" className="inline-block py-1.5 hover:text-ink-900">vs Melio</Link></li>
                <li><Link href="/vs-quickbooks" className="inline-block py-1.5 hover:text-ink-900">vs QuickBooks</Link></li>
                <li><Link href="/vs-zohobooks" className="inline-block py-1.5 hover:text-ink-900">vs Zoho Books</Link></li>
                <li><Link href="/vs-freshbooks" className="inline-block py-1.5 hover:text-ink-900">vs FreshBooks</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Company</h2>
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                <li><Link href="/about" className="inline-block py-1.5 hover:text-ink-900">About</Link></li>
                <li><a href="mailto:hello@getcollectly.app" className="inline-block py-1.5 hover:text-ink-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Legal</h2>
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                <li><Link href="/terms" className="inline-block py-1.5 hover:text-ink-900">Terms</Link></li>
                <li><Link href="/privacy" className="inline-block py-1.5 hover:text-ink-900">Privacy</Link></li>
                <li><Link href="/dpa" className="inline-block py-1.5 hover:text-ink-900">DPA</Link></li>
                <li><Link href="/security" className="inline-block py-1.5 hover:text-ink-900">Security</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
