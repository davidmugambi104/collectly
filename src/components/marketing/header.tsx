import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-ink-950">
          <Logo className="h-7 w-7" />
          <span className="text-lg">Collectly</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-ink-700">
          <Link href="/features" className="hover:text-ink-950">Features</Link>
          <Link href="/pricing" className="hover:text-ink-950">Pricing</Link>
          <Link href="/blog" className="hover:text-ink-950">Blog</Link>
          <Link href="/tools/ar-roi" className="hover:text-ink-950">ROI calculator</Link>
          <Link href="/customers" className="hover:text-ink-950">Customers</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="hidden sm:inline-flex btn-ghost text-sm">Sign in</Link>
          <Link href="/sign-up"><Button size="sm">Start free</Button></Link>
        </div>
      </div>
    </header>
  );
}
