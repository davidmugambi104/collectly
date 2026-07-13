import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('text-ink-950', className)} aria-label="Collectly">
      <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
      <path d="M9 16.5 13.5 21 23 11.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="11.5" r="1.4" fill="#10b981" stroke="white" strokeWidth="0.8" />
    </svg>
  );
}
