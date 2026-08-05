export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { requireAdminEmail } from '@/lib/auth-helper';
import { db } from '@/db';
import { waitlist } from '@/db/schema';
import { eq, desc, sql, and, like, or } from 'drizzle-orm';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { TaggingControls } from './tagging-controls';
import { Sparkles, ArrowUpRight, Mail, Filter, Download, Users, Clock, MessageSquare } from 'lucide-react';

export default async function InterviewsPage({ searchParams }: { searchParams: Promise<{ tag?: string; q?: string }> }) {
  // SECURITY: this reads across every prospect in the platform (the
  // `waitlist` table is global, not org-scoped) — a plain "is signed in"
  // check let any paying customer who found/guessed this URL, or clicked it
  // from their own nav, see every other prospect's raw lead data. Same
  // allowlist gate as /admin/upgrade-requests and the interviews API routes.
  const admin = await requireAdminEmail();
  if (!admin.ok) {
    return (
      <AppShell title="Customer interviews">
        <div className="card max-w-md mx-auto text-center py-12">
          <h2 className="h3">Not authorized</h2>
          <p className="mt-2 text-sm text-ink-600">This page is for the Collectly team only.</p>
        </div>
      </AppShell>
    );
  }

  const sp = await searchParams;
  const tag = sp.tag ?? 'all';
  const q = (sp.q ?? '').toLowerCase().trim();

  // All interview submissions (source starts with 'interview-form', tagged or not)
  const all = await db
    .select()
    .from(waitlist)
    .where(like(waitlist.source, 'interview-form%'))
    .orderBy(desc(waitlist.createdAt))
    .limit(200);

  // For the inbox counts, also include interview-form prefix
  const [{ interviews }] = await db
    .select({ interviews: sql<number>`count(*)::int` })
    .from(waitlist)
    .where(like(waitlist.source, 'interview-form%'));

  // Tag-based filter: derive from the source field
  // source: 'interview-form' (untagged), 'interview-form:icp', 'interview-form:maybe', 'interview-form:no'
  function tagOfSource(s: string | null | undefined): 'icp' | 'maybe' | 'no' | 'untagged' {
    if (!s) return 'untagged';
    if (s.endsWith(':icp')) return 'icp';
    if (s.endsWith(':maybe')) return 'maybe';
    if (s.endsWith(':no')) return 'no';
    return 'untagged';
  }

  // Heuristic for untagged interviews (used for the auto-display badge)
  function inferTagFromPain(p: string | null | undefined): 'icp' | 'maybe' {
    if (!p) return 'maybe';
    if (p.includes('interview') && (p.includes('US') || p.includes('UK') || p.includes('AU') || p.includes('CA'))) {
      return 'icp';
    }
    return 'maybe';
  }

  const filtered = all
    .filter((row: typeof all[number]) => {
      const t = tagOfSource(row.source);
      if (tag === 'all') {
        // also show untagged
      } else if (tag === 'icp') {
        if (t !== 'icp' && !(t === 'untagged' && inferTagFromPain(row.painPoint) === 'icp')) return false;
      } else if (tag === 'maybe') {
        if (t === 'icp' || t === 'no') return false;
      } else if (tag === 'no') {
        if (t !== 'no' && !(t === 'untagged')) return false;
      }
      if (q && !((row.email ?? '').toLowerCase().includes(q) || (row.name ?? '').toLowerCase().includes(q) || (row.company ?? '').toLowerCase().includes(q))) return false;
      return true;
    });

  // Group by ICP for header — use proper tag (source field), fall back to inferred
  const tagOfRow = (r: typeof all[number]): 'icp' | 'maybe' | 'no' => {
    const t = tagOfSource(r.source);
    if (t === 'no') return 'no';
    if (t === 'icp') return 'icp';
    if (t === 'maybe') return 'maybe';
    return inferTagFromPain(r.painPoint);
  };
  const icpCount = all.filter((r: typeof all[number]) => tagOfRow(r) === 'icp').length;
  const maybeCount = all.filter((r: typeof all[number]) => tagOfRow(r) === 'maybe').length;

  // Export URL
  const exportUrl = `/api/admin/interviews/export?tag=${tag}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <AppShell title="Customer interviews" subtitle={`${interviews} interview${interviews === 1 ? '' : 's'} captured`}>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <Stat icon={<Users className="h-4 w-4 text-brand-600" />} label="ICP fit (estimated)" value={String(icpCount)} sub="B2B service, US/UK/AU/CA, net-30/60" />
        <Stat icon={<Clock className="h-4 w-4 text-amber-600" />} label="Review queue" value={String(maybeCount)} sub="Needs manual review" />
        <Stat icon={<MessageSquare className="h-4 w-4 text-emerald-600" />} label="Recent (7d)" value={String(all.filter((r: typeof all[number]) => Date.now() - new Date(r.createdAt).getTime() < 7 * 86400000).length)} sub="Last 7 days" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/admin/interviews" className={`btn text-sm ${tag === 'all' ? 'btn-primary' : 'btn-secondary'}`}>All ({all.length})</Link>
          <Link href="/dashboard/admin/interviews?tag=icp" className={`btn text-sm ${tag === 'icp' ? 'btn-primary' : 'btn-secondary'}`}>ICP ({icpCount})</Link>
          <Link href="/dashboard/admin/interviews?tag=maybe" className={`btn text-sm ${tag === 'maybe' ? 'btn-primary' : 'btn-secondary'}`}>Review ({maybeCount})</Link>
        </div>
        <div className="flex-1" />
        <a href={exportUrl} className="btn-secondary text-sm">
          <Download className="h-3.5 w-3.5" />Export CSV
        </a>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Sparkles className="h-8 w-8 mx-auto text-ink-300" />
          <h3 className="mt-3 font-semibold text-ink-900">No interviews to review</h3>
          <p className="mt-1 text-sm text-ink-600 max-w-md mx-auto">
            {q ? <>No interviews match <b>"{q}"</b>. <Link href="/dashboard/admin/interviews" className="link">Clear filter</Link></> : <>Share your <Link href="/interview" className="link">/interview form</Link> link and submissions will land here.</>}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row: typeof all[number]) => {
            const sourceTag = tagOfSource(row.source);
            const effectiveTag = sourceTag === 'untagged' ? inferTagFromPain(row.painPoint) : sourceTag;
            // Extract the structured fields from the painPoint preamble
            const text = row.painPoint ?? '';
            const interviewMatch = text.match(/\[INTERVIEW\] Industry: ([^,]+), DSO: ([^,]+), A\/R: ([^,]+), Tool: ([^\n]+)\n?([\s\S]*)/);
            const industry = interviewMatch?.[1]?.trim() ?? null;
            const dso = interviewMatch?.[2]?.trim() ?? null;
            const outstanding = interviewMatch?.[3]?.trim() ?? null;
            const tool = interviewMatch?.[4]?.trim() ?? null;
            const pain = interviewMatch?.[5]?.trim() ?? text;
            return (
              <div key={row.id} className="card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink-900">{row.name ?? 'Anonymous'}</span>
                      {row.company && <span className="text-sm text-ink-500">· {row.company}</span>}
                      {row.country && <span className="badge-neutral text-[10px]">{row.country}</span>}
                      {row.teamSize && <span className="badge-neutral text-[10px]">{row.teamSize}</span>}
                      <span className={`badge text-[10px] ${effectiveTag === 'icp' ? 'badge-success' : 'badge-warn'}`}>
                        {effectiveTag === 'icp' ? 'ICP fit' : 'Review'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                      <a href={`mailto:${row.email}`} className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />{row.email}
                      </a>
                      <span>·</span>
                      <span>{formatDate(row.createdAt)}</span>
                    </div>

                    {interviewMatch && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {industry && industry !== '?' && <Field label="Industry" value={industry} />}
                        {dso && dso !== '?' && <Field label="DSO" value={`${dso}d`} />}
                        {outstanding && outstanding !== '?' && <Field label="A/R outstanding" value={outstanding} />}
                        {tool && tool !== '?' && <Field label="Current tool" value={tool} />}
                      </div>
                    )}

                    <div className="mt-3">
                      <div className="text-xs text-ink-500 mb-1">Their pain</div>
                      <p className="text-sm text-ink-800 leading-relaxed whitespace-pre-wrap">{pain}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <TaggingControls id={row.id} currentTag={effectiveTag === 'icp' ? 'icp' : effectiveTag === 'no' ? 'no' : 'maybe'} />
                    <a href={`mailto:${row.email}?subject=Re: Collectly interview — quick follow-up&body=Hi ${row.name?.split(' ')[0] ?? 'there'},%0A%0AThanks for taking the time to share your AR workflow...`} className="btn-primary text-xs whitespace-nowrap">
                      <ArrowUpRight className="h-3 w-3" />Reply
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500 uppercase tracking-wider font-medium">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-display font-bold text-ink-950">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-500">{label}</div>
      <div className="mt-0.5 text-ink-900 font-medium">{value}</div>
    </div>
  );
}
