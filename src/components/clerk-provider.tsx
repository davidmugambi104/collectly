'use client';

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

/**
 * Wraps the app in ClerkProvider only when Clerk keys are configured.
 * In dev (or any env) without keys, returns children unwrapped so the
 * dashboard's dev-auth shim (USE_DEV_AUTH=1) keeps working.
 *
 * `signInUrl` / `signUpUrl` are explicit so Clerk's catchall routes
 * don't fight the route group.
 */
export function ClerkProvider({ children }: { children: ReactNode }) {
  // Skip Clerk entirely when the dev shim is on — Clerk would try to
  // initialize on the client and (with mismatched or unused keys) cause
  // infinite redirect loops. The dev shim handles auth server-side.
  if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === '1' || process.env.USE_DEV_AUTH === '1') {
    return <>{children}</>;
  }
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return <>{children}</>;

  return (
    <BaseClerkProvider
      publishableKey={pk}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up'}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      {children}
    </BaseClerkProvider>
  );
}
