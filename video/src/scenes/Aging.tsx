import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Chrome } from '../components/Chrome';
import { Card } from '../components/Card';
import { ink, danger, warn, money, font } from '../theme';

const ROWS = [
  { c: 'Acme Corp', a: 24_500, d: 4, b: '1-30' },
  { c: 'Design Studio LLC', a: 8_200, d: 12, b: '1-30' },
  { c: 'Consulting Group', a: 42_000, d: 38, b: '31-60' },
  { c: 'Tech Partners Inc', a: 15_750, d: 67, b: '61-90' },
  { c: 'Global Services Ltd', a: 93_800, d: 95, b: '90+' },
];

const bucketColor = (b: string) =>
  b === '90+'
    ? { bg: danger[100], fg: danger[700] }
    : b === '1-30'
      ? { bg: ink[100], fg: ink[600] }
      : { bg: warn[100], fg: warn[700] };

export const Aging: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = ROWS.reduce((s, r) => s + r.a, 0);

  // Count the headline figure up rather than cutting to it: the number is the
  // point of the scene and a static one is easy to scroll past.
  const counted = Math.round(
    interpolate(frame, [10, 40], [0, total], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );

  return (
    <Chrome active="Overview" title="A/R aging" subtitle="Every unpaid invoice, oldest debt first.">
      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, color: ink[500] }}>Outstanding A/R</div>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 52,
            fontWeight: 700,
            color: ink[950],
            letterSpacing: -1,
            marginTop: 2,
          }}
        >
          {money(counted)}
        </div>
        <div style={{ fontSize: 15, color: danger[600], fontWeight: 500, marginTop: 4 }}>
          ↑ 23% vs last month
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {ROWS.map((r, i) => {
          // Each row springs in on its own beat so the eye is led down the
          // list instead of being handed all five at once.
          const enter = spring({ frame: frame - 26 - i * 6, fps, config: { damping: 200 } });
          const c = bucketColor(r.b);
          return (
            <div
              key={r.c}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 22px',
                borderTop: i === 0 ? 'none' : `1px solid ${ink[200]}`,
                opacity: enter,
                transform: `translateY(${(1 - enter) * 8}px)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: ink[100],
                    color: ink[600],
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {r.c.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 500, color: ink[900] }}>{r.c}</div>
                  <div style={{ fontSize: 14, color: ink[500] }}>{r.d} days overdue</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <span
                  style={{
                    background: c.bg,
                    color: c.fg,
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {r.b}
                </span>
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize: 19,
                    fontWeight: 600,
                    color: ink[900],
                    minWidth: 110,
                    textAlign: 'right',
                  }}
                >
                  {money(r.a)}
                </span>
              </div>
            </div>
          );
        })}
      </Card>
    </Chrome>
  );
};
