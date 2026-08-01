import { NextRequest, NextResponse } from 'next/server';
import { requireAdminEmail } from '@/lib/auth-helper';
import { db } from '@/db';
import { waitlist } from '@/db/schema';
import { desc, like } from 'drizzle-orm';
import { ensureBootstrapped } from '@/lib/bootstrap-db';

export async function GET(req: NextRequest) {
  await ensureBootstrapped();
  // SECURITY: this exports every interview lead ever collected (name,
  // email, company, DSO, pain points) across the whole business — not
  // scoped to any org. Any signed-in customer previously satisfied the
  // old `orgId` check; now gated by the same admin allowlist as
  // /admin/upgrade-requests.
  const admin = await requireAdminEmail();
  if (!admin.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const tag = sp.get('tag') ?? 'all';

  const all = await db
    .select()
    .from(waitlist)
    .where(like(waitlist.source, 'interview-form%'))
    .orderBy(desc(waitlist.createdAt))
    .limit(500);

  function tagOf(s: string | null | undefined) {
    if (!s) return 'maybe';
    if (s.endsWith(':icp')) return 'icp';
    if (s.endsWith(':no')) return 'no';
    return 'maybe';
  }

  const rows = tag === 'all' ? all : all.filter((r: typeof all[number]) => tagOf(r.source) === tag);

  const header = ['id', 'created_at', 'name', 'email', 'company', 'country', 'team_size', 'tag', 'industry', 'dso', 'outstanding', 'tool', 'pain'];
  const lines = [header.join(',')];

  for (const r of rows) {
    const text = r.painPoint ?? '';
    const m = text.match(/\[INTERVIEW\] Industry: ([^,]+), DSO: ([^,]+), A\/R: ([^,]+), Tool: ([^\n]+)\n?([\s\S]*)/);
    const industry = m?.[1]?.trim() ?? '';
    const dso = m?.[2]?.trim() ?? '';
    const outstanding = m?.[3]?.trim() ?? '';
    const tool = m?.[4]?.trim() ?? '';
    const pain = (m?.[5] ?? text).replace(/"/g, '""').replace(/\n/g, ' ').slice(0, 500);
    const fields = [
      r.id,
      new Date(r.createdAt).toISOString(),
      r.name ?? '',
      r.email,
      r.company ?? '',
      r.country ?? '',
      r.teamSize ?? '',
      tagOf(r.source),
      industry,
      dso,
      outstanding,
      tool,
      pain,
    ];
    lines.push(fields.map((f) => `"${(f ?? '').toString().replace(/"/g, '""')}"`).join(','));
  }

  const csv = lines.join('\n');
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="collectly-interviews-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
