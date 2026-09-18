import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Chrome } from '../components/Chrome';
import { Card } from '../components/Card';
import { ink, brand, success, font } from '../theme';

const BODY = `Hi Sarah,

Invoice INV-2370 for $93,800 was due 95 days ago. I know the Q3 handover was messy on both sides, so I wanted to check this hasn't simply been missed rather than chase you about it.

If there's a PO or approval blocking it, tell me and I'll reissue. Otherwise you can settle it here: pay.getcollectly.app/inv-2370

Thanks,
Davie`;

const STEPS = [
  { day: 'Day 1', tone: 'Friendly', ch: 'Email' },
  { day: 'Day 7', tone: 'Friendly', ch: 'Email' },
  { day: 'Day 14', tone: 'Firm', ch: 'Email' },
  { day: 'Day 30', tone: 'Final', ch: 'SMS' },
];

export const Dunning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Type the message out. The claim is that the AI writes in your tone, so the
  // words have to be readable — a static block would be skimmed past.
  const chars = Math.round(
    interpolate(frame, [30, 330], [0, BODY.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  return (
    <Chrome
      active="Dunning"
      title="AI dunning"
      subtitle="Written in your tone, per customer — not a mail merge."
    >
      <div style={{ display: 'flex', gap: 18 }}>
        <Card style={{ flex: 1.45, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: ink[500], marginBottom: 10 }}>
            To: Sarah Whitfield · Global Services Ltd · INV-2370
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, color: ink[950], marginBottom: 16 }}>
            Invoice INV-2370 — can I help unblock this?
          </div>
          <div
            style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: ink[700],
              whiteSpace: 'pre-wrap',
              minHeight: 330,
            }}
          >
            {BODY.slice(0, chars)}
            {chars < BODY.length && frame % 16 < 8 ? (
              <span style={{ borderLeft: `2px solid ${brand[600]}`, marginLeft: 1 }} />
            ) : null}
          </div>
        </Card>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <div style={{ fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: ink[500] }}>
              Sequence
            </div>
            <div style={{ marginTop: 14 }}>
              {STEPS.map((s, i) => {
                const enter = spring({ frame: frame - 40 - i * 14, fps, config: { damping: 200 } });
                const isFinal = s.tone === 'Final';
                return (
                  <div
                    key={s.day}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '13px 0',
                      borderTop: i === 0 ? 'none' : `1px solid ${ink[200]}`,
                      opacity: enter,
                      transform: `translateX(${(1 - enter) * 10}px)`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 600, color: ink[900] }}>{s.day}</div>
                      <div style={{ fontSize: 14, color: ink[500] }}>{s.ch}</div>
                    </div>
                    <span
                      style={{
                        background: isFinal ? ink[100] : brand[50],
                        color: isFinal ? ink[700] : brand[700],
                        borderRadius: 999,
                        padding: '4px 12px',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {s.tone}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card style={{ marginTop: 18, background: success[100], borderColor: success[500] }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: success[700] }}>
              Stops the moment they reply
            </div>
            <div style={{ fontSize: 15, color: ink[700], marginTop: 5, lineHeight: 1.5 }}>
              A reply or a payment pauses the sequence automatically. Nobody gets chased for
              something they already settled.
            </div>
          </Card>
        </div>
      </div>
    </Chrome>
  );
};
