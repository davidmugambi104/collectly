import { getAuth as auth } from '@/lib/auth-helper';
import { IdentifyUser } from '@/components/app/identify-user';
import { WorkspaceProvider, type WorkspaceChrome } from '@/components/app/workspace-context';
import { db } from '@/db';
import { organizations, subscriptions, inboxMessages } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Loads the small amount of live data the app chrome needs (org name, trial
 * state, unread inbox count) once per navigation, so AppShell can stop
 * hardcoding it. Kept deliberately cheap: three narrow queries, and any
 * failure degrades to neutral chrome rather than taking the whole dashboard
 * down with it — the sidebar is not worth a 500.
 */
async function loadChrome(orgId: string | null | undefined): Promise<WorkspaceChrome> {
  const base: WorkspaceChrome = {
    orgName: null,
    plan: null,
    isTrialing: false,
    trialDaysLeft: 0,
    trialTotalDays: 14,
    unreadCount: 0,
  };
  if (!orgId) return base;

  try {
    const [[org], [sub], [unread]] = await Promise.all([
      db.select({ name: organizations.name, plan: organizations.plan })
        .from(organizations).where(eq(organizations.id, orgId)).limit(1),
      db.select({ status: subscriptions.status, plan: subscriptions.plan, periodEnd: subscriptions.currentPeriodEnd, periodStart: subscriptions.currentPeriodStart })
        .from(subscriptions).where(eq(subscriptions.orgId, orgId)).limit(1),
      db.select({ n: sql<number>`count(*)` })
        .from(inboxMessages)
        .where(and(eq(inboxMessages.orgId, orgId), eq(inboxMessages.status, 'new'))),
    ]);

    const isTrialing = sub?.status === 'trialing';
    const trialDaysLeft = sub?.periodEnd
      ? Math.max(0, Math.ceil((new Date(sub.periodEnd).getTime() - Date.now()) / 86400000))
      : 0;
    // Derive the trial length from the subscription period itself rather than
    // assuming 14, so the meter stays honest if the trial length ever changes.
    const trialTotalDays =
      sub?.periodStart && sub?.periodEnd
        ? Math.max(
            1,
            Math.round(
              (new Date(sub.periodEnd).getTime() - new Date(sub.periodStart).getTime()) / 86400000,
            ),
          )
        : 14;

    return {
      orgName: org?.name ?? null,
      plan: sub?.plan ?? org?.plan ?? null,
      isTrialing,
      trialDaysLeft,
      trialTotalDays,
      unreadCount: Number(unread?.n ?? 0),
    };
  } catch {
    return base;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth();
  const chrome = await loadChrome(orgId);

  return (
    <>
      <IdentifyUser userId={userId ?? undefined} orgId={orgId ?? undefined} />
      {/* `.app` scopes the authenticated product's palette and component
          overrides (see the APP LAYER block in globals.css). It is applied
          here, at the layout, so every dashboard route inherits it and the
          marketing pages — which share the same globals.css — are untouched.
          `contents` keeps this wrapper out of the layout box model entirely,
          so AppShell's min-h-screen flex still resolves against the body. */}
      <div className="app contents">
        <WorkspaceProvider value={chrome}>{children}</WorkspaceProvider>
      </div>
    </>
  );
}
