'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HOLD_SECONDS, holdEndsAt, holdIsOver, holdSecondsLeft } from '@/lib/dunning/send-hold';

/**
 * A 30-second hold before something is sent by hand. start(key, run) begins the
 * countdown and calls run() when it ends; cancel(key) is Undo. Leaving the page
 * or unmounting cancels every hold, so a reminder is only ever sent by a page
 * that is still open and showing the countdown.
 */
export function useSendHold() {
  const ends = useRef(new Map<string, { endsAt: number; run: () => void }>());
  const [now, setNow] = useState(() => Date.now());
  const [, force] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };

  const tick = useCallback(() => {
    const t = Date.now();
    setNow(t);
    for (const [key, h] of [...ends.current]) {
      if (holdIsOver(h.endsAt, t)) { ends.current.delete(key); h.run(); }
    }
    if (ends.current.size === 0) stopTimer();
    force((n) => n + 1);
  }, []);

  const start = useCallback((key: string, run: () => void) => {
    if (ends.current.has(key)) return;
    ends.current.set(key, { endsAt: holdEndsAt(Date.now()), run });
    setNow(Date.now());
    if (!timer.current) timer.current = setInterval(tick, 250);
    force((n) => n + 1);
  }, [tick]);

  const cancel = useCallback((key: string) => {
    ends.current.delete(key);
    if (ends.current.size === 0) stopTimer();
    force((n) => n + 1);
  }, []);

  // Leaving the page drops every hold. While one is running, ask first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (ends.current.size > 0) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    const map = ends.current;
    return () => { window.removeEventListener('beforeunload', warn); map.clear(); stopTimer(); };
  }, []);

  const secondsLeft = (key: string): number | null => {
    const h = ends.current.get(key);
    return h ? holdSecondsLeft(h.endsAt, now) : null;
  };

  return { start, cancel, secondsLeft, seconds: HOLD_SECONDS, holding: ends.current.size > 0 };
}
