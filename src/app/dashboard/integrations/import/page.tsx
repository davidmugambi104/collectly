export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { getAuth as auth } from '@/lib/auth-helper';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CsvImport } from './csv-import-client';

export default async function ImportPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  return (
    <AppShell title="Import from a spreadsheet" subtitle="Works with an export from any accounting tool. No keys or sign-in to your books needed.">
      <Link href="/dashboard/integrations" className="link-quiet mb-4 inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" />Back to integrations</Link>
      <CsvImport />
    </AppShell>
  );
}
