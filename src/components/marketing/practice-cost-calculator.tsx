'use client';

import { useId, useState } from 'react';
import { crossoverBooks, mugaviCost, paidniceCost, PAIDNICE_ENTITY_MONTHLY, type MugaviPrices } from '@/lib/practice-cost';

const PLAN_LABEL = {
  single: 'Single plan',
  singles: 'separate Single plans',
  practice: 'Practice plan',
  scale: 'Scale plan',
} as const;

function toInt(raw: string, min: number, max: number): number | null {
  if (raw.trim() === '') return null;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

/**
 * Monthly cost for the same client books, Mugavi against Paidnice, from the
 * figures both companies publish. The point of showing the invoice volume as an
 * input is that it moves the answer: a practice whose books send few invoices
 * stays cheaper on Paidnice for longer. Nothing here is hidden or rounded in our
 * favour, and the working is printed under the result.
 */
export function PracticeCostCalculator({ prices, checkedOn }: { prices: MugaviPrices; checkedOn: string }) {
  const booksId = useId();
  const invId = useId();
  const [booksRaw, setBooksRaw] = useState('10');
  const [invRaw, setInvRaw] = useState('30');

  const books = toInt(booksRaw, 1, 100000);
  const inv = toInt(invRaw, 0, 1000);
  const ready = books !== null && inv !== null;

  const us = ready ? mugaviCost(books, prices) : null;
  const them = ready ? paidniceCost(books, inv) : null;
  const cross = inv !== null ? crossoverBooks(inv, prices) : null;
  const diff = us && them ? us.monthly - them.monthly : null;

  return (
    <div className="panel p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={booksId} className="label">Client books you run</label>
          <input
            id={booksId}
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={booksRaw}
            onChange={(e) => setBooksRaw(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={invId} className="label">Invoices each book sends in a month</label>
          <input
            id={invId}
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            max={1000}
            value={invRaw}
            onChange={(e) => setInvRaw(e.target.value)}
          />
        </div>
      </div>

      <div aria-live="polite" className="mt-5">
        {!ready && <p className="app-body text-ink-600">Enter both numbers to see the monthly cost.</p>}

        {ready && us && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-ink-200 p-4">
              <div className="app-meta">Mugavi</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">${us.monthly}/mo</div>
              <div className="app-meta mt-1">
                {PLAN_LABEL[us.plan]}
                {us.plan === 'singles' ? `, ${books} x $${prices.single}` : ''}
                {us.plan === 'practice' && books > prices.practiceBooks
                  ? `, ${books - prices.practiceBooks} extra at $${prices.extraBook}`
                  : ''}
              </div>
            </div>
            <div className="rounded-lg border border-ink-200 p-4">
              <div className="app-meta">Paidnice (from their public pricing)</div>
              {them ? (
                <>
                  <div className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">${them.monthly}/mo</div>
                  <div className="app-meta mt-1">
                    {them.tier} ${them.tierMonthly} (up to {them.invoiceCap} invoices a month)
                    {them.extraEntities > 0 ? `, plus ${them.extraEntities} extra entities at $${PAIDNICE_ENTITY_MONTHLY}` : ''}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-lg font-semibold text-ink-900">Custom quote</div>
              )}
            </div>
          </div>
        )}

        {ready && !us && (
          <p className="app-body text-ink-700">
            More than {prices.scaleBooks} client books: we would price that by conversation.
          </p>
        )}

        {ready && us && them && diff !== null && (
          <p className="mt-4 app-body text-ink-800">
            {diff === 0
              ? 'The two cost the same at these numbers.'
              : diff < 0
                ? `Mugavi costs about $${-diff} a month less at these numbers.`
                : `Paidnice costs about $${diff} a month less at these numbers.`}
            {cross !== null && inv !== null && books < cross
              ? ` At ${inv} invoices per book, Mugavi becomes the cheaper one from ${cross} books.`
              : ''}
          </p>
        )}
        {ready && us && !them && (
          <p className="mt-4 app-body text-ink-800">
            Paidnice does not publish a price above 4,000 invoices a month in total, so we cannot compare this size.
          </p>
        )}
      </div>

      <p className="mt-4 app-meta">
        Paidnice figures are from paidnice.com/pricing, read {checkedOn}: the Pro price for your total monthly invoices,
        plus ${PAIDNICE_ENTITY_MONTHLY} for each entity after the first. Their invoice allowance is shared across
        entities. We have not confirmed the entity add-on with them. Subscriptions only: no tax, no annual discount,
        and none of what either product does beyond chasing. Check their pricing before you decide.
      </p>
    </div>
  );
}
