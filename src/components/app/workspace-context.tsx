'use client';

import { createContext, useContext } from 'react';

/**
 * Live workspace chrome data, provided once by the dashboard layout (a server
 * component) and consumed by AppShell (a client component).
 *
 * This exists because AppShell previously hardcoded its own chrome: the
 * sidebar always read "Trial · 13 days left" for every user on every plan
 * forever, and the header always rendered an unread notification dot whether
 * or not anything was unread. Both are the kind of detail a prospect notices
 * exactly once, after which nothing else in the interface is trusted. Routing
 * the real values through context keeps AppShell's per-page API unchanged
 * (title/subtitle/children) instead of making all 19 call sites fetch and
 * forward billing state they have no other use for.
 */
export type WorkspaceChrome = {
  /** Org display name for the sidebar switcher. */
  orgName: string | null;
  /** Current plan key, e.g. 'starter' | 'growth'. */
  plan: string | null;
  /** True while the subscription is in its trial window. */
  isTrialing: boolean;
  /** Whole days remaining in the trial; 0 when not trialing or already over. */
  trialDaysLeft: number;
  /** Total length of the trial, used to draw the meter's filled proportion. */
  trialTotalDays: number;
  /** Unread inbox messages — drives the Inbox nav count. */
  unreadCount: number;
};

const FALLBACK: WorkspaceChrome = {
  orgName: null,
  plan: null,
  isTrialing: false,
  trialDaysLeft: 0,
  trialTotalDays: 14,
  unreadCount: 0,
};

const WorkspaceContext = createContext<WorkspaceChrome>(FALLBACK);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceChrome;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/**
 * Falls back to a neutral, non-claiming shape rather than throwing when no
 * provider is present, so AppShell stays renderable in isolation (tests,
 * storybook, the dev-auth shim) — it just shows no trial meter and no count.
 */
export function useWorkspace(): WorkspaceChrome {
  return useContext(WorkspaceContext);
}
