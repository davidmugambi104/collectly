export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/app/shell';
import { requireAdminEmail } from '@/lib/auth-helper';
import { configStatus, todoOrder } from '@/lib/config-status';

const LABEL = { now: 'Needed now', soon: 'Needed soon', later: 'Later or dormant' } as const;

export default async function ConfigPage() {
  // SECURITY: shows which keys are set across the platform. Names and yes/no only, never a value,
  // and still limited to the admin allowlist like the other admin pages.
  const admin = await requireAdminEmail();
  if (!admin.ok) {
    return (
      <AppShell title="Services">
        <div className="card max-w-md mx-auto text-center py-12">
          <h2 className="h3">Not authorized</h2>
          <p className="mt-2 text-sm text-ink-600">This page is for the Mugavi team only.</p>
        </div>
      </AppShell>
    );
  }

  const status = configStatus(process.env);
  const todo = todoOrder(status);

  return (
    <AppShell title="Services" subtitle={todo.length === 0 ? 'Everything is configured' : `${todo.length} not configured yet`}>
      {todo.length > 0 && (
        <div className="card-primary mb-6">
          <h2 className="app-heading">Do next</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {todo.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.name}</span> <span className="badge ml-1">{LABEL[s.needed]}</span>
                <div className="text-ink-600">{s.without} Get it at: {s.where}.</div>
                <div className="text-xs text-ink-500">Missing: {s.missing.join(', ')}</div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(['now', 'soon', 'later'] as const).map((n) => (
        <div key={n} className="card-primary mb-6 overflow-x-auto">
          <h2 className="app-heading">{LABEL[n]}</h2>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">{LABEL[n]} services and whether they are configured</caption>
            <thead><tr className="text-left text-ink-600"><th scope="col" className="py-2 pr-4 font-medium">Service</th><th scope="col" className="py-2 pr-4 font-medium">What it does</th><th scope="col" className="py-2 font-medium">Status</th></tr></thead>
            <tbody>
              {status.filter((s) => s.needed === n).map((s) => (
                <tr key={s.id} className="border-t border-ink-200/70 align-top">
                  <th scope="row" className="py-2 pr-4 text-left font-medium">{s.name}</th>
                  <td className="py-2 pr-4">{s.why}</td>
                  <td className="py-2">{s.configured ? <span className="text-success-700">Set</span> : <span className="text-danger-900">Missing {s.missing.length}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </AppShell>
  );
}
