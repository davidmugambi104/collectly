import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function MarketingFooter() {
  return (
    <footer className="mt-32 border-t border-ink-200 bg-ink-50">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-6">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-ink-950">
              <Logo className="h-7 w-7" />
              <span>Collectly</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-ink-600">Honest AR automation for 5-30 person agencies and consultancies on Xero. Built in Nairobi.</p>
            <div className="mt-5 inline-flex flex-wrap gap-2 text-xs text-ink-500">
              <span className="rounded-md border border-ink-200 bg-white px-2 py-1">🇺🇸 🇬🇧 🇪🇺 🇦🇺 🇨🇦 🇰🇪 🇳🇬</span>
              <span className="rounded-md border border-ink-200 bg-white px-2 py-1">5–30 person teams</span>
              <span className="rounded-md border border-ink-200 bg-white px-2 py-1">Xero (QuickBooks beta)</span>
            </div>
            <p className="mt-6 text-xs text-ink-500">© 2026 Collectly, Inc. · Built in Nairobi.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/tour" className="hover:text-ink-900">Demo</Link></li>
              <li><Link href="/features" className="hover:text-ink-900">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-ink-900">Pricing</Link></li>
              <li><Link href="/integrations" className="hover:text-ink-900">Integrations</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Free tools</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/tools/ar-cost-calculator" className="hover:text-ink-900">Late-payment cost calculator</Link></li>
              <li><Link href="/ar-audit" className="hover:text-ink-900">Free A/R audit</Link></li>
              <li><Link href="/compare" className="hover:text-ink-900">Compare to competitors</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Compare</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/vs-chaser" className="hover:text-ink-900">vs Chaser</Link></li>
              <li><Link href="/vs-bill" className="hover:text-ink-900">vs BILL</Link></li>
              <li><Link href="/vs-melio" className="hover:text-ink-900">vs Melio</Link></li>
              <li><Link href="/vs-quickbooks" className="hover:text-ink-900">vs QuickBooks</Link></li>
              <li><Link href="/vs-zohobooks" className="hover:text-ink-900">vs Zoho Books</Link></li>
              <li><Link href="/vs-freshbooks" className="hover:text-ink-900">vs FreshBooks</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/about" className="hover:text-ink-900">About</Link></li>
              <li><a href="mailto:hello@getcollectly.app" className="hover:text-ink-900">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/terms" className="hover:text-ink-900">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-ink-900">Privacy</Link></li>
              <li><Link href="/dpa" className="hover:text-ink-900">DPA</Link></li>
              <li><Link href="/security" className="hover:text-ink-900">Security</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
