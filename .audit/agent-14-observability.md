# Agent 14: Observability

## Tests run (with verbatim output)

### 1. Healthcheck probe: `curl -sD- https://getcollectly.app/api/healthcheck | head -25`

```
HTTP/2 200
age: 0
cache-control: public, max-age=0, must-revalidate
content-type: application/json
date: Fri, 31 Jul 2026 13:10:07 GMT
server: Vercel
strict-transport-security: max-age=63072000
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
x-matched-path: /api/healthcheck
x-vercel-cache: MISS
x-vercel-id: cpt1::iad1::9sfhb-1785503407084-632114873d2d

{"ok":true,"service":"collectly","uptime":596.365226907,"db":"reachable","took_ms":55,"ts":"2026-07-31T13:10:07.456Z"}
```

### 2. Vercel production logs (last 1h, limit 30)

```
Vercel CLI 56.3.2 (Node.js 22.22.3)
Retrieving project…
Fetching logs...
No logs found for david-mugambis-projects/collectly on branch main
```

### 3. Sentry configured? `grep -rE 'SENTRY|Sentry'`

```
./src/app/global-error.tsx:    // In production, send to Sentry/PostHog here.
```

**Result:** no Sentry SDK, DSN, or instrumentation anywhere else. Sentry is **not configured**.

### 4. PostHog presence

```
./src/components/posthog-provider.tsx:import posthog from 'posthog-js';
./src/components/posthog-provider.tsx:import { PostHogProvider as PHProvider } from 'posthog-js/react';
./src/components/posthog-provider.tsx:  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
./src/components/posthog-provider.tsx:    if (pathname && process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.capture('$pageview', { $current_url: window.location.href });
./src/components/posthog-provider.tsx:export function PostHogProvider({ children }: { children: React.ReactNode }) {
./src/components/posthog-provider.tsx:  return <PHProvider client={posthog}><PageviewTracker />{children}</PHProvider>;
./src/app/terms/page.tsx:              authentication, PostHog for product analytics) ...
./src/app/security/page.tsx:            <span>...PostHog is product analytics only...</span>
./src/app/dpa/page.tsx:          <li><b>PostHog</b> — product analytics (no customer data sent).</li>
./src/app/privacy/page.tsx:              <li>Product-analytics events sent to PostHog...</li>
```

**Result:** PostHog is wired for client-side product analytics/pageviews only. No server-side PostHog error capture.

### 5. `next.config.mjs` / `vercel.json`

```js
// next.config.mjs
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  serverExternalPackages: ['@electric-sql/pglite'],
  webpack: (config, { isServer }) => {
    if (!isServer) return config;
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({ '@electric-sql/pglite': 'commonjs @electric-sql/pglite' });
    }
    return config;
  },
};
export default nextConfig;
```

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/dunning", "schedule": "0 14 * * *" }
  ]
}
```

No logging integrations, no `headers` for CSP/reporting, no log drains, no analytics config.

### 6. `/api/healthcheck` actual checks

```ts
const startedAt = Date.now();
try {
  await ensureBootstrapped();
  await db.execute(sql`SELECT 1`);
  return NextResponse.json({
    ok: true,
    service: 'collectly',
    uptime: process.uptime(),
    db: 'reachable',
    took_ms: Date.now() - startedAt,
    ts: new Date().toISOString(),
  });
} catch (e: any) {
  return NextResponse.json(
    { ok: false, service: 'collectly', db: 'unreachable', error: String(e?.message ?? e), ... },
    { status: 503 },
  );
}
```

Checks: DB reachable (`SELECT 1`), app bootstrapped, process uptime, response timing. Does **not** verify: external integrations (Stripe, Clerk, email/SMTP), queue depth, disk/PGLite bootstrap health, memory, cron last-run age.

### 7. Search findings

- **Vercel function log retention:** default retention is short; 30-day runtime log retention available in **Vercel Observability Plus** (Aug 2025). Free/pro default is limited, so production investigations rely on short-lived logs.
- **Sentry vs PostHog 2026:**
  - PostHog = product analytics, funnels, session replay, basic error capture.
  - Sentry = purpose-built error/performance monitoring with stack traces, release/source-map tracking, alerting.
  - Recommended pattern: **Sentry for breakage, PostHog for behavior**, often used together.

## What I found

- **Sentry: missing.** The only mention is a `// TODO` comment in `global-error.tsx`.
- **PostHog: present but narrow.** Client-side pageviews only; not used for server errors, exceptions, or session replay.
- **Server-side error capture: none.** `global-error.tsx` only `console.error` in the browser; no backend integration.
- **Structured logging: absent.** ~150 ad-hoc `console.*` calls; no structured logger (pino/winston), no correlation IDs, no severity levels, no request context.
- **Vercel logs: empty for the last hour.** Either very low traffic or logs have already aged out of the default retention window.
- **Healthcheck: shallow but functional.** Verifies DB and uptime; missing integration dependency checks and no alerting path except cron ping.
- **No log drains / observability plumbing.** `next.config.mjs` and `vercel.json` have no log drain, Sentry plugin, error-boundary wiring, or headers for CSP/reporting.

## What should change

1. **Add Sentry for Next.js** with `@sentry/nextjs`, DSN via env, source maps on build, `global-error.tsx` capture, and API-route instrumentation.
2. **Wire server-side PostHog error capture** or at least structured server logs for exceptions in API/cron routes.
3. **Replace ad-hoc `console.*` calls** with a structured logger (pino) that emits JSON on Vercel; add `requestId`/`traceId` propagation via async context or middleware.
4. **Extend `/api/healthcheck`** to probe critical integrations (Stripe webhook status/health, Clerk JWKS reachable, SMTP/SendGrid, cron heartbeat age) and surface per-check status.
5. **Configure a log drain or Vercel Observability Plus** for production (30-day retention) and consider shipping logs to an external sink (Datadog, Logflare, Axiom).
6. **Add CSP / reporting headers** and `report-to`/`report-uri` for client-side error telemetry capture.
7. **Instrument cron jobs** with start/end/error events so failures are visible outside of Vercel’s short logs window.

## Source / evidence

- `curl` probe output above (live 200, DB reachable, took 55ms, Vercel `x-vercel-id`).
- `vercel logs` CLI returned `No logs found for david-mugambis-projects/collectly on branch main`.
- `grep` results: Sentry only a TODO in `src/app/global-error.tsx`; PostHog in `src/components/posthog-provider.tsx` and privacy pages.
- `src/app/api/healthcheck/route.ts` lines quoted above.
- `src/app/global-error.tsx` only `console.error` and UI reset.
- `next.config.mjs` and `vercel.json` contents quoted above.
- Web search results: Vercel docs on Runtime Logs / Observability Plus 30-day retention; Sentry/PostHog comparison articles confirming complementary roles.
