'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PLAN_PRICING } from '@/lib/utils';

/**
 * A call to action that follows you down the page, on phones only.
 *
 * The homepage is 21,000px on a 390px viewport — around 25 screens. The only
 * two ways to act on it were the hero, which is gone after the first screen,
 * and the closing section, which is twenty-four screens of scrolling away. A
 * visitor convinced somewhere in the middle had nothing to tap.
 *
 * Desktop does not need this: the header is already sticky there and keeps
 * "Join founding" on screen the whole way down. On mobile that button is
 * inside the collapsed menu, so it is two taps and a decision away.
 *
 * It stays out of the way at both ends — hidden over the hero, where the real
 * buttons are larger and better, and hidden again near the foot of the page so
 * it never sits on top of the closing CTA it duplicates.
 */
export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const bottom = document.documentElement.scrollHeight - (y + viewport);
      // Past the hero, and not yet into the closing CTA and footer.
      setShow(y > viewport * 1.2 && bottom > viewport * 2.2);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      // aria-hidden while off-screen so it is not announced twice: the same
      // link exists in the page content.
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur md:hidden motion-safe:transition-transform motion-safe:duration-200 ${
        show ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
      // The home-indicator strip on modern phones sits over the bottom edge.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-950">
            Start free for 14 days
          </p>
          <p className="truncate text-xs text-ink-500">
            No card · from ${PLAN_PRICING.starter.monthly}/mo after
          </p>
        </div>
        <Link
          href="/sign-up"
          tabIndex={show ? undefined : -1}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 active:bg-ink-800"
        >
          Start <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
