import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-ink-50">
      <Logo className="h-10 w-10 text-ink-950" />
      <h1 className="mt-6 text-4xl font-display font-bold text-ink-950">404</h1>
      <p className="mt-2 text-lg text-ink-700">Page not found</p>
      <p className="mt-1 text-sm text-ink-500 max-w-md text-center">
        The page you were looking for doesn&apos;t exist, or it may have been moved.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link href="/" className="btn-primary">Go home</Link>
        <Link href="/dashboard" className="btn-secondary">Open dashboard</Link>
      </div>
    </div>
  );
}
