# Agent 1: Auth & middleware

## Tests run (with verbatim output)

### 1. Public healthcheck: `curl -sD- https://getcollectly.app/api/healthcheck`

```
HTTP/2 200 
age: 0
cache-control: public, max-age=0, must-revalidate
content-type: application/json
date: Fri, 31 Jul 2026 13:04:48 GMT
server: Vercel
strict-transport-security: max-age=63072000
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
x-matched-path: /api/healthcheck
x-vercel-cache: MISS
x-vercel-id: cpt1::iad1::tbhcv-1785503088350-5dda324c9689

{"ok":true,"service":"collectly","uptime":277.659403704,"db":"reachable","took_ms":84,"ts":"2026-07-31T13:04:48.755Z"}
```

Healthcheck is public and working.

### 2. Protected dashboard redirect: `curl -sD- https://getcollectly.app/dashboard`

```
HTTP/2 307 
cache-control: public, max-age=0, must-revalidate
content-type: text/plain
date: Fri, 31 Jul 2026 13:04:48 GMT
location: /sign-in
server: Vercel
strict-transport-security: max-age=63072000
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
x-vercel-id: cpt1::r42bx-1785503088358-bf56ae6de4f2

Redirecting...
```

Redirects correctly. Note: 307 instead of 302; browsers follow it the same way.

### 3. Protected admin API: `curl -sD- https://getcollectly.app/api/admin/interviews/export`

```
HTTP/2 401 
age: 0
cache-control: public, max-age=0, must-revalidate
content-type: application/json
date: Fri, 31 Jul 2026 13:04:48 GMT
server: Vercel
strict-transport-security: max-age=63072000
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
x-matched-path: /api/admin/interviews/export
x-vercel-cache: MISS
x-vercel-id: cpt1::iad1::z9k28-1785503088368-0307e61cf198

{"error":"unauthorized"}
```

Returns 401 as expected.

### 4. Sign-in page: `curl -sD- https://getcollectly.app/sign-in`

```
HTTP/2 200 
age: 0
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
content-type: text/html; charset=utf-8
date: Fri, 31 Jul 2026 13:04:48 GMT
server: Vercel
strict-transport-security: max-age=63072000
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
x-matched-path: /sign-in/[[...sign-in]]
x-powered-by: Next.js
x-vercel-cache: MISS
x-vercel-id: cpt1::iad1::vx8t9-1785503088378-51b2cec4ffce

<!DOCTYPE html>...
```

Page returns HTML and loads Clerk (`clerk.browser.js`) with publishable key `pk_live_<REDACTED>`.

### 5. Git history

```
cd /home/davie/.openclaw/workspace/collectly && git log --oneline -- src/middleware.ts src/lib/auth-helper.ts

a80b550 fix: manual Clerk auth redirect, public healthcheck, deploy resend-inbound webhook
480ab64 deploy: expose /api/inbound webhook + public route exemptions
31a9cf6 honest: integration statuses, replace interview links with product tour + free audit, add /tour page
ae05710 marketing: honest trust signals, free A/R audit lead magnet, remove fake logos
cc5d0e3 marketing: 9 competitor comparison pages, /compare index, /ar-roi redirect, enhanced ROI calculator, homepage AR audit CTA
baafe3b fix(middleware): add /vs-* comparison pages to public routes
5e1ab7f 2026-07-23: comprehensive audit fixes from 7 parallel sub-agents
7d9092f fix(middleware): allow /api/integrations/sync through Clerk auth gate
ef9125b fix(integrations): handle OAuth error redirects + post-connect banner
eb756f3 feat: dev shim + Clerk fallback + 4 OAuth routes + 3 marketing pages + dev DB
08e7d0c feat: AI finance assistant — insights, exec summary, real DSO/trends
9c50e45 feat: dev PGlite + dev auth + seed data + dashboard verified end-to-end
fbfce64 feat: initial Collectly build — marketing site, dashboard, AI dunning, integrations, billing
```

### 6. Clerk env vars

```
cd /home/davie/.openclaw/workspace/collectly && grep -E 'CLERK' .env.local

CLERK_SECRET_KEY="sk_live_<REDACTED>"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_<REDACTED>"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

## Best-practice search findings

### Clerk middleware guidance (official docs, 2026)

- `createRouteMatcher()` is **deprecated**. Clerk recommends migrating to resource-based auth checks instead of route-matcher lists in middleware.
- Middleware is **not the best place to protect routes**. Clerk docs say: "protect access as close to the resource as possible, in the code that reads or mutates the data."
- Docs still use `clerkMiddleware()` as the entry point but advise pairing it with `auth()` / `auth.protect()` checks inside route handlers, not relying on middleware alone.

Source: https://clerk.com/docs/reference/nextjs/clerk-middleware (fetched 2026-07-31)

### Clerk healthcheck public-route issue

A Clerk GitHub issue notes that adding `/api/healthz` to the public-route list in newer middleware did not fully exempt the route, forcing users to use negative lookahead such as `/api/(?!healthz)(.*)`. That matches the current Collectly approach of listing `/api/healthcheck` in `isPublicRoute` rather than excluding it at the matcher level.

Source: https://github.com/clerk/javascript/issues/1441 (fetched 2026-07-31)

### Next.js middleware matcher best practice

Running middleware on every request adds latency and can run auth logic on static chunks and favicons. A common pattern is to include static-file exclusions in `config.matcher` (e.g. skip `_next`, `.css`, `.js`, images, etc.). Collectly’s matcher does skip `+\.[\w]+$` and `_next`, but it does not include `__clerk` and may still match other static file extensions unless covered by the regex.

Source: https://www.guardlayer.io/blog/nextjs-middleware-matcher (search result)

## What I found

1. **Live probes all behave as designed** — healthcheck is public, dashboard redirects to `/sign-in`, admin API returns 401, sign-in page renders.

2. **Clerk publishable key is exposed in HTML** — this is normal for Clerk frontend JS (`data-clerk-publishable-key`), but verify it is the public key, not the secret key. The secret key is stored only in `CLERK_SECRET_KEY` in `.env.local`, which is correct.

3. **The middleware still uses `createRouteMatcher()`**, which Clerk now deprecates (`src/middleware.ts:5`). The comment says the manual `userId` check is intentional to avoid Clerk’s default 404 rewrite, but this is a workaround rather than the current recommended pattern.

4. **The public-route list is large and growing ad-hoc** (`src/middleware.ts:8-48`). Multiple recent commits are just adding missing public routes (`/vs-*`, `/api/inbound`, `/api/integrations/sync`, healthcheck, etc.). This is fragile and easy to miss a route.

5. **Auth protection is concentrated in middleware only** — there is no evidence of resource-level `auth.protect()` or role checks in route handlers. This matches the Clerk docs’ warning: "Middleware is not the best place to protect routes."

6. **No `dashboard/layout.tsx` exists** — the task asked to inspect it but it is not present. Dashboard auth/role enforcement is therefore not happening at the layout level.

7. **Dev auth shim is live and guarded by a runtime check** (`src/middleware.ts:55-67`, `src/lib/auth-helper.ts:22-31`). The check refuses to enable in production and logs a `FATAL` error. This is a good safety net, but the fallback `undefined` middleware function (`src/middleware.ts:73-75`) means missing Clerk keys in dev would silently make all routes public.

8. **`getAuthWithOrg()` creates a Clerk organization automatically** (`src/lib/auth-helper.ts:132-222`) if the user has no org. This can create many personal orgs and does not check plan/role limits. It also mirrors local DB rows inline inside the auth helper, mixing auth and persistence concerns.

9. **Healthcheck public status is confirmed by test**, but the implementation relies on the public-route list rather than an explicit matcher exclusion. A matcher-level exclusion is less likely to regress when the public list changes.

## What should change

| Priority | Recommendation | Rationale |
|----------|----------------|-----------|
| **P1** | Add resource-level auth guards in route handlers and server components, not just middleware. | Clerk official guidance says middleware alone is insufficient; the data layer should enforce access. |
| **P1** | Replace ad-hoc `createRouteMatcher()` list with an explicit public-prefix allowlist and move known public paths (healthcheck, webhooks, static, auth pages) into `config.matcher` exclusions where possible. | `createRouteMatcher()` is deprecated and the list keeps regressing (multiple recent fix commits). |
| **P2** | Migrate manual `userId` check to `auth.protect()` inside route handlers / server actions, and use `redirectToSignIn()` only in UI routes. | Manual checks are error-prone; `auth.protect()` is Clerk’s maintained primitive. |
| **P2** | Add a test/probe for `/api/webhooks/stripe` and `/api/webhooks/clerk` to confirm they remain public and return expected challenge/status. | Webhooks are in the public list and a regression would break billing/auth sync. |
| **P2** | Audit `/api/admin/interviews/(.*)` being public. The probe above was `/api/admin/interviews/export`, which returned 401, but the matcher lists `/api/admin/interviews/(.*)` as public. This is inconsistent and needs clarification or a fix. | The middleware and route handler disagree on whether this admin path is public. |
| **P3** | Consider extracting the Clerk org/local-DB mirroring logic out of `getAuthWithOrg()` into a dedicated sync helper called explicitly after sign-up. | Mixing auth context creation with DB writes couples concerns and complicates retries/error handling. |

## Source / evidence

- Live probes: `https://getcollectly.app` (2026-07-31 13:04 UTC)
- Repo HEAD: `bf5622d1c94a5a59b39987597dd939d76643810f`
- Files inspected:
  - `src/middleware.ts`
  - `src/lib/auth-helper.ts`
  - `src/app/sign-in/[[...sign-in]]/page.tsx`
  - `src/app/dashboard/layout.tsx` (does not exist)
  - `.env.local`
- Docs: https://clerk.com/docs/reference/nextjs/clerk-middleware
- GitHub issue: https://github.com/clerk/javascript/issues/1441
- Search source: https://www.guardlayer.io/blog/nextjs-middleware-matcher
