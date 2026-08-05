'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Rule-based "is this user stuck" detector — thresholds and counters, no ML.
 * Same category of signal Intercom/Appcues/Pendo use before any predictive
 * layer: rage clicks, idling with unfinished work, a repeated error, and
 * bouncing between the same couple of screens without progressing. Each
 * signal fires at most once until dismissed (or until the page navigates
 * away from a bounce-watched route), so it never nags.
 */

export type StuckSignal =
  | { type: 'rage-click'; target: string }
  | { type: 'idle-unsaved' }
  | { type: 'repeated-error'; message: string }
  | { type: 'bounce' };

type Options = {
  /** data-stuck-id values to watch for rapid repeat clicks. */
  watchIds?: string[];
  /** Window event name whose boolean `detail` marks "unsaved work exists". */
  unsavedEvent?: string;
  /** Window event name whose string `detail` is the current error (null clears it). */
  errorEvent?: string;
  /** Enables bounce detection while the current route is in this list. */
  bounceRoutes?: string[];
  bounceStorageKey?: string;
  idleMs?: number;
  rageWindowMs?: number;
  rageThreshold?: number;
  bounceWindowMs?: number;
  bounceThreshold?: number;
};

function signalKey(s: StuckSignal): string {
  switch (s.type) {
    case 'rage-click': return `rage-click:${s.target}`;
    case 'repeated-error': return `repeated-error:${s.message}`;
    case 'idle-unsaved': return 'idle-unsaved';
    case 'bounce': return 'bounce';
  }
}

export function useStuckSignals(opts: Options) {
  const {
    watchIds = [],
    unsavedEvent,
    errorEvent,
    bounceRoutes = [],
    bounceStorageKey = 'collectly.stuck.routeHistory',
    idleMs = 45_000,
    rageWindowMs = 1_200,
    rageThreshold = 3,
    bounceWindowMs = 20_000,
    bounceThreshold = 3,
  } = opts;

  const [signal, setSignal] = useState<StuckSignal | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());
  const hasUnsavedRef = useRef(false);
  const lastErrorRef = useRef<{ message: string; count: number } | null>(null);
  const clickLogRef = useRef<Map<string, number[]>>(new Map());
  const lastInteractionRef = useRef(Date.now());
  const pathname = usePathname();

  const fire = useCallback((s: StuckSignal) => {
    const key = signalKey(s);
    if (dismissedRef.current.has(key)) return;
    setSignal((cur) => cur ?? s);
  }, []);

  const dismiss = useCallback(() => {
    setSignal((cur) => {
      if (cur) dismissedRef.current.add(signalKey(cur));
      return null;
    });
  }, []);

  // Rage clicks on watched elements.
  useEffect(() => {
    if (!watchIds.length) return;
    function onClick(e: MouseEvent) {
      lastInteractionRef.current = Date.now();
      const el = (e.target as HTMLElement).closest('[data-stuck-id]') as HTMLElement | null;
      if (!el) return;
      const id = el.getAttribute('data-stuck-id')!;
      if (!watchIds.includes(id)) return;
      const now = Date.now();
      const log = (clickLogRef.current.get(id) ?? []).filter((t) => now - t < rageWindowMs);
      log.push(now);
      clickLogRef.current.set(id, log);
      if (log.length >= rageThreshold) {
        fire({ type: 'rage-click', target: id });
        clickLogRef.current.set(id, []);
      }
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [watchIds, rageWindowMs, rageThreshold, fire]);

  // Any interaction resets the idle clock.
  useEffect(() => {
    function bump() { lastInteractionRef.current = Date.now(); }
    document.addEventListener('scroll', bump, true);
    document.addEventListener('keydown', bump);
    document.addEventListener('click', bump);
    return () => {
      document.removeEventListener('scroll', bump, true);
      document.removeEventListener('keydown', bump);
      document.removeEventListener('click', bump);
    };
  }, []);

  // Idle while unsaved work exists.
  useEffect(() => {
    if (!unsavedEvent) return;
    function onUnsaved(e: Event) { hasUnsavedRef.current = !!(e as CustomEvent).detail; }
    window.addEventListener(unsavedEvent, onUnsaved as EventListener);
    const t = setInterval(() => {
      if (!hasUnsavedRef.current) return;
      if (Date.now() - lastInteractionRef.current >= idleMs) fire({ type: 'idle-unsaved' });
    }, 3_000);
    return () => { window.removeEventListener(unsavedEvent, onUnsaved as EventListener); clearInterval(t); };
  }, [unsavedEvent, idleMs, fire]);

  // Same error message firing 2+ times in a row.
  useEffect(() => {
    if (!errorEvent) return;
    function onError(e: Event) {
      const message = (e as CustomEvent).detail as string | null;
      if (!message) { lastErrorRef.current = null; return; }
      lastErrorRef.current = lastErrorRef.current?.message === message
        ? { message, count: lastErrorRef.current.count + 1 }
        : { message, count: 1 };
      if (lastErrorRef.current.count >= 2) fire({ type: 'repeated-error', message });
    }
    window.addEventListener(errorEvent, onError as EventListener);
    return () => window.removeEventListener(errorEvent, onError as EventListener);
  }, [errorEvent, fire]);

  // Bouncing between the same watched routes without progressing.
  useEffect(() => {
    if (!bounceRoutes.length || !pathname || !bounceRoutes.includes(pathname)) return;
    let history: number[] = [];
    try { history = JSON.parse(sessionStorage.getItem(bounceStorageKey) ?? '[]'); } catch { history = []; }
    const now = Date.now();
    history = history.filter((t) => now - t < bounceWindowMs);
    history.push(now);
    try { sessionStorage.setItem(bounceStorageKey, JSON.stringify(history)); } catch {}
    if (history.length >= bounceThreshold) {
      fire({ type: 'bounce' });
      try { sessionStorage.removeItem(bounceStorageKey); } catch {}
    }
    // Only re-run when the route actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return { signal, dismiss };
}
