import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function MarketingFooter() {
  return (
    <footer className="mt-32 border-t border-ink-200 bg-ink-50">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-ink-950">
              <Logo className="h-7 w-7" />
              <span>Collectly</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-ink-600">AI-native accounts receivable for small businesses. Get paid in days, not months.</p>
            <p className="mt-6 text-xs text-ink-500">© 2026 Collectly, Inc. · Built in Nairobi. Used globally.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/features" className="hover:text-ink-900">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-ink-900">Pricing</Link></li>
              <li><Link href="/integrations" className="hover:text-ink-900">Integrations</Link></li>
              <li><Link href="/changelog" className="hover:text-ink-900">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link href="/about" className="hover:text-ink-900">About</Link></li>
              <li><Link href="/customers" className="hover:text-ink-900">Customers</Link></li>
              <li><Link href="/blog" className="hover:text-ink-900">Blog</Link></li>
              <li><Link href="/tour" className="hover:text-ink-900">Product tour</Link></li>
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
