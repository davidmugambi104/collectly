'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Hand, ChevronRight, X } from 'lucide-react';

const STORAGE_KEY = 'collectly.dunning.tour.v1';
const REPLAY_EVENT = 'dunning-tour:replay';

const STEPS: Array<{ selector: string; title: string; body: string }> = [
  {
    selector: '[data-tour="impact"]',
    title: "Here's what's on the line",
    body: 'Revenue at risk is what’s overdue right now. Recovered via dunning is what automation already brought back — the numbers this whole page exists to move.',
  },
  {
    selector: '[data-tour="control"]',
    title: 'One switch runs everything',
    body: 'Flip this and the steps below start firing on their own, by days overdue. Nothing else on this page needs to be touched for reminders to go out.',
  },
  {
    selector: '[data-tour="flow"]',
    title: 'This is the actual sequence',
    body: 'One node per reminder, in order — invoice overdue, escalating steps, customer pays. Tap any step to change its timing, channel, or tone.',
  },
  {
    selector: '[data-tour="generate-preview"]',
    title: 'Nothing here is hidden',
    body: 'This generates the exact message the AI would send, and shows exactly who it’s going to, before anything is saved or sent for real.',
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function measure(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function DunningTour() {
  const [stepIndex, setStepIndex] = useState(-1);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  function finish() {
    setStepIndex(-1);
    setRect(null);
    try { localStorage.setItem(STORAGE_KEY, 'done'); } catch {}
  }

  // First run only — small delay so it appears after the page's own
  // entrance animations settle instead of popping in mid-transition.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY) === 'done'; } catch {}
    if (!seen) {
      const t = setTimeout(() => setStepIndex(0), 900);
      return () => clearTimeout(t);
    }
  }, []);

  // Manual replay, e.g. from the "Replay guide" button — ignores whether
  // it's been seen before.
  useEffect(() => {
    function onReplay() { setStepIndex(0); }
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, []);

  // Track the target element's position while a step is active, including
  // through the smooth-scroll that brings it into view.
  useEffect(() => {
    if (stepIndex < 0) { setRect(null); return; }
    const step = STEPS[stepIndex];
    const el = document.querySelector(step.selector);
    if (!el) { setStepIndex((i) => (i + 1 < STEPS.length ? i + 1 : -1)); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    function tick() {
      if (!el) return;
      setRect(measure(el));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    // Stop the per-frame tracking once things settle — no need to burn
    // cycles on a static tooltip after the scroll animation finishes.
    const stop = setTimeout(() => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, 900);
    return () => { stop && clearTimeout(stop); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [stepIndex]);

  // If the user clicks a real control the tour is pointing at — on their
  // own, not via the tour's Next button — that's proof they already get
  // it. Step aside instead of forcing them through the rest of the script.
  useEffect(() => {
    if (stepIndex < 0) return;
    function onClickCapture(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (el.closest('[data-tour-ui]')) return;
      if (el.closest('[data-tour]')) finish();
    }
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [stepIndex]);

  if (stepIndex < 0 || !rect) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const pad = 8;
  const spot = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };

  const spaceBelow = window.innerHeight - (spot.top + spot.height);
  const placeBelow = spaceBelow > 190 || spot.top < 190;
  const tooltipWidth = 320;
  const tooltipLeft = Math.min(Math.max(spot.left, 16), window.innerWidth - tooltipWidth - 16);
  const tooltipTop = placeBelow ? spot.top + spot.height + 16 : Math.max(16, spot.top - 190);

  // Portalled straight to <body> — AppShell's <main> has overflow-x-hidden,
  // and Chromium clips position:fixed descendants to an ancestor's overflow
  // box even though fixed elements aren't supposed to use it as their
  // containing block. Escaping via portal sidesteps that entirely.
  return createPortal(
    <>
      {/* Spotlight: four dimmed panels framing the highlighted rect (rather
          than a single oversized box-shadow, which some stacking contexts
          swallow) plus a bright ring drawn on the cutout itself. */}
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
      {/* The hand — a literal pointing gesture at the thing to interact
          with, tapping in place rather than just described in text. */}
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
          key={stepIndex}
          data-tour-ui
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="fixed z-[61] rounded-xl bg-ink-900 text-white p-4 shadow-2xl"
          style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-300">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <button onClick={finish} className="text-ink-400 hover:text-white -m-1 p-1" aria-label="Skip tour">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="font-semibold text-sm">{step.title}</div>
          <p className="mt-1 text-xs text-ink-300 leading-relaxed">{step.body}</p>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={finish} className="text-xs text-ink-400 hover:text-white">Skip tour</button>
            <button
              onClick={() => (isLast ? finish() : setStepIndex(stepIndex + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-white text-ink-900 text-xs font-semibold px-3 py-1.5 hover:bg-ink-100"
            >
              {isLast ? 'Got it' : 'Next'}{!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body,
  );
}

export function ReplayTourButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-tour-ui
      onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}
      className={className}
    >
      <Hand className="h-3.5 w-3.5" />Replay guide
    </button>
  );
}
