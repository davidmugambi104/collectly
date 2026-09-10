'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Hand, ChevronRight, X } from 'lucide-react';

/**
 * Shared spotlight primitive: dims the page, cuts out a bright ring around
 * `selector`, and shows a small tooltip near it. Used both by the scripted
 * onboarding tour (DunningTour) and by ad-hoc stuck-user hints (StuckHelper)
 * so both share one visual language instead of two competing UI patterns.
 */

type Rect = { top: number; left: number; width: number; height: number };

function measure(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function Spotlight({
  selector,
  badge,
  title,
  body,
  primaryLabel = 'Got it',
  onPrimary,
  onDismiss,
  secondaryLabel,
  onSecondary,
  dismissOnTargetClick = true,
}: {
  selector: string;
  badge?: string;
  title: string;
  body: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  onDismiss: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  dismissOnTargetClick?: boolean;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  // Track the target element's position, including through the smooth-scroll
  // that brings it into view. If the target vanishes from the DOM (e.g. the
  // element it points to unmounted), dismiss instead of hanging forever.
  useEffect(() => {
    const el = document.querySelector(selector);
    if (!el) { onDismiss(); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    function tick() {
      const live = document.querySelector(selector);
      if (!live) { onDismiss(); return; }
      setRect(measure(live));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    const stop = setTimeout(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, 900);
    return () => { clearTimeout(stop); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector]);

  // Clicking the real target it's pointing at counts as "got it" on its own.
  useEffect(() => {
    if (!dismissOnTargetClick) return;
    function onClickCapture(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (el.closest('[data-tour-ui]')) return;
      if (el.closest(selector)) onDismiss();
    }
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [selector, onDismiss, dismissOnTargetClick]);

  if (!rect) return null;

  const pad = 8;
  const spot = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
  const spaceBelow = window.innerHeight - (spot.top + spot.height);
  const placeBelow = spaceBelow > 190 || spot.top < 190;
  const tooltipWidth = 320;
  const tooltipLeft = Math.min(Math.max(spot.left, 16), window.innerWidth - tooltipWidth - 16);
  const tooltipTop = placeBelow ? spot.top + spot.height + 16 : Math.max(16, spot.top - 190);

  // Portalled to <body> — an ancestor's overflow-x-hidden clips fixed
  // descendants in Chromium even though it shouldn't. Escaping via portal
  // sidesteps that.
  return createPortal(
    <>
      {[
        { top: 0, left: 0, right: 0, height: spot.top },
        { top: spot.top + spot.height, left: 0, right: 0, bottom: 0 },
        { top: spot.top, left: 0, width: spot.left, height: spot.height },
        { top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height },
      ].map((panel, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="fixed z-[60] pointer-events-none bg-ink-950/60"
          animate={panel}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        />
      ))}
      <motion.div
        aria-hidden
        className="fixed z-[60] rounded-xl pointer-events-none border-2 border-brand-400 shadow-[0_0_0_4px_rgba(37,99,235,0.25)]"
        animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      <motion.div
        aria-hidden
        className="fixed z-[62] pointer-events-none text-white drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
        animate={{
          top: spot.top + spot.height - 10,
          left: spot.left + spot.width - 14,
          rotate: [-18, -26, -18],
          y: [0, 4, 0],
        }}
        transition={{
          top: { type: 'spring', stiffness: 300, damping: 30 },
          left: { type: 'spring', stiffness: 300, damping: 30 },
          rotate: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <Hand className="h-7 w-7" strokeWidth={2.25} />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selector}
          data-tour-ui
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="fixed z-[61] rounded-xl bg-ink-900 text-white p-4 shadow-2xl"
          style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
        >
          <div className="flex items-center justify-between mb-2">
            {badge ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-300">{badge}</span>
            ) : <span />}
            <button onClick={onDismiss} className="text-ink-400 hover:text-white -m-1 p-1" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="font-semibold text-sm">{title}</div>
          <p className="mt-1 text-xs text-ink-300 leading-relaxed">{body}</p>
          <div className="mt-3 flex items-center justify-between">
            {secondaryLabel ? (
              <button onClick={onSecondary ?? onDismiss} className="text-xs text-ink-400 hover:text-white">{secondaryLabel}</button>
            ) : <span />}
            <button
              onClick={onPrimary ?? onDismiss}
              className="inline-flex items-center gap-1 rounded-lg bg-white text-ink-900 text-xs font-semibold px-3 py-1.5 hover:bg-ink-100"
            >
              {primaryLabel}{primaryLabel === 'Next' && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body,
  );
}
