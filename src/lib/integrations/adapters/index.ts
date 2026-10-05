/**
 * The registered provider adapters. Provider agents: import your adapter and add ONE line to ADAPTERS.
 * An id missing from this map means "no adapter yet": the Integrations card shows "Not available yet".
 */
import type { ProviderAdapter, ProviderId } from '../adapter.ts';

export const ADAPTERS: Partial<Record<ProviderId, ProviderAdapter>> = {
  // freshbooks: freshbooksAdapter,
  // zoho_books: zohoBooksAdapter,
  // sage: sageAdapter,
  // wave: waveAdapter,
};

export function getAdapter(id: string): ProviderAdapter | null {
  return Object.hasOwn(ADAPTERS, id) ? ((ADAPTERS as Record<string, ProviderAdapter | undefined>)[id] ?? null) : null;
}
