'use client';

import { useRouter } from 'next/navigation';
import { Filter } from 'lucide-react';

export type DunningChannel = 'all' | 'email' | 'sms';
export type DaysFilter = '7' | '30' | '90' | 'all';

export function FilterBar({ channel, days }: { channel: DunningChannel; days: DaysFilter }) {
  const router = useRouter();
  const set = (next: Partial<{ channel: DunningChannel; days: DaysFilter }>) => {
    const c = next.channel ?? channel;
    const d = next.days ?? days;
    const sp = new URLSearchParams();
    if (c !== 'all') sp.set('channel', c);
    if (d !== '30') sp.set('days', d);
    const qs = sp.toString();
    router.push(qs ? `/dashboard/dunning/performance?${qs}` : '/dashboard/dunning/performance');
  };
  const pill = (active: boolean) =>
    `text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-ink-950 text-white border-ink-950' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-400'}`;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-ink-500 mr-1">
        <Filter className="h-3.5 w-3.5" />Filter
      </div>
      {(['all', 'email', 'sms'] as const).map((v) => (
        <button key={v} type="button" onClick={() => set({ channel: v })} className={pill(channel === v)}>
          {v === 'all' ? 'All' : v === 'email' ? 'Email' : 'SMS'}
        </button>
      ))}
      <div className="h-5 w-px bg-ink-200 mx-1" />
      {(['7', '30', '90', 'all'] as const).map((v) => (
        <button key={v} type="button" onClick={() => set({ days: v })} className={pill(days === v)}>
          {v === 'all' ? 'All time' : `${v}d`}
        </button>
      ))}
    </div>
  );
}
