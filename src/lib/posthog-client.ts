import type { PostHog } from 'posthog-js';

/**
 * posthog-js is about 60 kB gzipped. It used to be imported statically by the
 * root layout's provider, so every visitor downloaded and parsed it, including
 * the large share who never grant analytics consent and therefore never run
 * it. It is now fetched only after consent, from here.
 */
let client: PostHog | null = null;
let loading: Promise<PostHog> | null = null;

export function loadPostHog(): Promise<PostHog> {
  if (client) return Promise.resolve(client);
  if (!loading) {
    loading = import('posthog-js').then((m) => {
      client = m.default;
      return client;
    });
  }
  return loading;
}

/** The client if it has already been loaded, otherwise null. Never triggers a load. */
export function getLoadedPostHog(): PostHog | null {
  return client;
}

let pendingIdentity: { id: string; props?: Record<string, string> } | null = null;

/**
 * Identify the signed-in user once PostHog is up. Safe to call before consent
 * or before the library has loaded: it is remembered and applied by
 * markPostHogReady(), and dropped if analytics is never allowed.
 */
export function identifyWhenReady(id: string, props?: Record<string, string>): void {
  pendingIdentity = { id, props };
  if (client && (client as unknown as { __loaded?: boolean }).__loaded) applyPending();
}

export function markPostHogReady(): void {
  applyPending();
}

function applyPending(): void {
  if (!client || !pendingIdentity) return;
  client.identify(pendingIdentity.id, pendingIdentity.props);
  pendingIdentity = null;
}
