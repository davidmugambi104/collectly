import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Chrome } from '../components/Chrome';
import { Card } from '../components/Card';
import { ink, brand, money, font } from '../theme';

// Same demo figures as the marketing chart in
// src/components/marketing/cash-forecast-chart.tsx, so the video and the site
// cannot quote different numbers for the same claim.
const WEEKS = [
  { w: 'Week 1', confirmed: 14_200, likely: 11_800, uncertain: 3_100 },
  { w: 'Week 2', confirmed: 9_400, likely: 16_200, uncertain: 5_600 },
  { w: 'Week 3', confirmed: 6_100, likely: 12_400, uncertain: 8_200 },
  { w: 'Week 4', confirmed: 2_800, likely: 9_600, uncertain: 11_400 },
];

const BANDS = [
  { key: 'confirmed', label: 'Confirmed promise-to-pay', color: brand[600] },
  { key: 'likely', label: 'Reliable payer', color: brand[400] },
  { key: 'uncertain', label: 'Uncertain', color: ink[300] },
] as const;

const MAX = Math.max(...WEEKS.map((x) => x.confirmed + x.likely + x.uncertain));
const CHART_H = 300;

export const Forecast: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = WEEKS.reduce((s, x) => s + x.confirmed + x.likely + x.uncertain, 0);

  const counted = Math.round(
    interpolate(frame, [8, 38], [0, total], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );

  return (
    <Chrome
      active="Cash flow"
      title="Four-week cash forecast"
      subtitle="Which part is solid, and which part is hope."
    >
      <Card>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, color: ink[500] }}>Expected over 4 weeks</div>
            <div style={{ fontFamily: font.mono, fontSize: 46, fontWeight: 700, color: ink[950] }}>
              {money(counted)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {BANDS.map((b) => (
              <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: b.color }} />
                <span style={{ fontSize: 14, color: ink[600] }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 34,
            height: CHART_H,
            marginTop: 30,
            paddingLeft: 6,
          }}
        >
          {WEEKS.map((week, i) => {
            const grow = spring({ frame: frame - 34 - i * 8, fps, config: { damping: 200 } });
            const stackTotal = week.confirmed + week.likely + week.uncertain;
            return (
              <div key={week.w} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: (stackTotal / MAX) * CHART_H * grow,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    borderRadius: '8px 8px 0 0',
                    overflow: 'hidden',
                  }}
                >
                  {BANDS.map((b) => (
                    <div
                      key={b.key}
                      style={{ height: `${(week[b.key] / stackTotal) * 100}%`, background: b.color }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 15, color: ink[600], marginTop: 12 }}>{week.w}</div>
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: 16,
                    fontWeight: 600,
                    color: ink[900],
                    opacity: grow,
                  }}
                >
                  {money(stackTotal)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ marginTop: 18 }}>
        <div style={{ fontSize: 17, color: ink[700], lineHeight: 1.55 }}>
          Week one is mostly money someone has promised in writing. By week four most of it is
          not. <b style={{ color: ink[950] }}>That is the week to worry about</b> — and you can see
          it four weeks out instead of on the day.
        </div>
      </Card>
    </Chrome>
  );
};
