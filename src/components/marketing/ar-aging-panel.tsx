'use client';

import { Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * The hero's A/R aging panel, on shadcn Card + Table + Tabs.
 *
 * Previously a stack of hand-styled divs with a flex row per customer
 * pretending to be a table. Rows of data with a header ARE a table; writing
 * them as divs means a screen reader gets five unrelated groups instead of a
 * grid with column headers, and the aging bucket loses its association with
 * the amount beside it.
 *
 * DEMO DATA. Every company and figure below is invented for the marketing
 * page. It is not a customer, not an anonymised customer, and not derived from
 * any real ledger — the panel is labelled "Demo data" in its own header so the
 * claim is visible on the page rather than only in this comment.
 */

type Bucket = '1-30' | '31-60' | '61-90' | '90+';

type DemoRow = {
  customer: string;
  amount: number;
  daysOverdue: number;
  bucket: Bucket;
};

const DEMO_ROWS: DemoRow[] = [
  { customer: 'Acme Corp', amount: 24_500, daysOverdue: 4, bucket: '1-30' },
  { customer: 'Design Studio LLC', amount: 8_200, daysOverdue: 12, bucket: '1-30' },
  { customer: 'Consulting Group', amount: 42_000, daysOverdue: 38, bucket: '31-60' },
  { customer: 'Tech Partners Inc', amount: 15_750, daysOverdue: 67, bucket: '61-90' },
  { customer: 'Global Services Ltd', amount: 93_800, daysOverdue: 95, bucket: '90+' },
];

const TABS: { key: 'all' | Bucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: '1-30', label: '1–30' },
  { key: '31-60', label: '31–60' },
  { key: '61-90', label: '61–90' },
  { key: '90+', label: '90+' },
];

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

function badgeClass(bucket: Bucket) {
  if (bucket === '90+') return 'badge badge-danger';
  if (bucket === '61-90' || bucket === '31-60') return 'badge badge-warn';
  return 'badge badge-neutral';
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
}

function AgingRows({ rows }: { rows: DemoRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-ink-500">
        Nothing in this bucket — which is the point.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Customer</TableHead>
          <TableHead>Age</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.customer}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ink-100 text-[10px] font-semibold text-ink-600"
                  aria-hidden="true"
                >
                  {initials(row.customer)}
                </span>
                <span className="font-medium text-ink-900">{row.customer}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className={badgeClass(row.bucket)}>{row.bucket}</span>
              <span className="ml-2 text-[11px] text-ink-500">{row.daysOverdue}d</span>
            </TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums text-ink-900">
              {money(row.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ArAgingPanel() {
  const total = DEMO_ROWS.reduce((sum, r) => sum + r.amount, 0);

  return (
    <Card className="overflow-hidden shadow-2xl shadow-ink-950/10">
      <div className="flex items-center justify-between px-5 pb-1 pt-5">
        <span className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
          A/R aging
        </span>
        <span className="text-2xs text-ink-500">Demo data</span>
      </div>

      <div className="p-5 pt-3">
        <div className="mb-4">
          <div className="text-xs text-ink-500">Outstanding A/R</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-ink-950">
            {money(total)}
          </div>
          {/* Outstanding A/R rising is the BAD outcome — it is the pain the
              product sells against. Rendering it success-green with an up
              arrow told a finance-literate buyer that nobody here reads their
              own hero. The dashboard renders the same concept red. */}
          <div className="mt-0.5 text-xs font-medium text-danger-600">↑ 23% vs last month</div>
        </div>

        <Tabs defaultValue="all">
          {/* Radix gives these arrow-key navigation and the aria wiring; the
              previous div stack had neither, and a bucket filter that cannot
              be reached from the keyboard is decoration. */}
          <TabsList className="w-full justify-start overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-3">
              <AgingRows
                rows={t.key === 'all' ? DEMO_ROWS : DEMO_ROWS.filter((r) => r.bucket === t.key)}
              />
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-4 flex items-center justify-between border-t border-ink-200 pt-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-100">
              <Mail className="h-3.5 w-3.5 text-success-700" />
            </span>
            <div>
              <div className="text-xs font-semibold text-ink-900">Auto-collected</div>
              <div className="text-[11px] text-ink-500">Consulting Group — 12 min ago</div>
            </div>
          </div>
          <div className="font-mono font-semibold tabular-nums text-success-700">$2,840</div>
        </div>
      </div>
    </Card>
  );
}
