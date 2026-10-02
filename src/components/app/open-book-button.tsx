'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList } from '@clerk/nextjs';

/** Switch to a client book and land on its dashboard. Clerk decides whether the person may. */
export function OpenBookButton({ orgId, label, to = '/dashboard' }: { orgId: string; label: string; to?: string }) {
  const router = useRouter();
  const { isLoaded, setActive } = useOrganizationList();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function open() {
    if (!isLoaded || !setActive) return;
    setBusy(true); setFailed(false);
    try {
      await setActive({ organization: orgId });
      router.push(to);
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={open} disabled={!isLoaded || busy} className="btn-secondary btn-sm" aria-label={`Open ${label}`}>
        {busy ? 'Opening…' : 'Open'}
      </button>
      {failed && <span role="alert" className="text-xs text-danger-900">Could not switch. Use the organization switcher.</span>}
    </span>
  );
}
