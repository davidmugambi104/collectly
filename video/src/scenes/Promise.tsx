import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Chrome } from '../components/Chrome';
import { Card } from '../components/Card';
import { ink, brand, success, money, font } from '../theme';

export const Promise: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const replyIn = spring({ frame: frame - 14, fps, config: { damping: 200 } });
  const parseIn = spring({ frame: frame - 62, fps, config: { damping: 200 } });
  const cardIn = spring({ frame: frame - 110, fps, config: { damping: 200 } });
  // The highlight sweeps across the promised date inside the quote, so the
  // viewer sees WHICH words produced the parsed result.
  const sweep = interpolate(frame, [70, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Chrome
      active="Inbox"
      title="Promise-to-pay"
      subtitle='"We&apos;ll pay next Friday" becomes a date the forecast can use.'
    >
      <Card style={{ opacity: replyIn, transform: `translateY(${(1 - replyIn) * 10}px)` }}>
        <div style={{ fontSize: 14, color: ink[500] }}>
          Reply from Tom Ackerley · Tech Partners Inc · INV-2380
        </div>
        <div style={{ fontSize: 20, lineHeight: 1.6, color: ink[800], marginTop: 12 }}>
          Sorry for the delay — this slipped when our controller left.{' '}
          <span
            style={{
              background: `linear-gradient(90deg, ${brand[100]} ${sweep * 100}%, transparent ${sweep * 100}%)`,
              borderRadius: 4,
              padding: '2px 0',
            }}
          >
            It&apos;s approved now and goes out in Friday&apos;s payment run.
          </span>
        </div>
      </Card>

      <div
        style={{
          display: 'flex',
          gap: 18,
          marginTop: 18,
          opacity: parseIn,
          transform: `translateY(${(1 - parseIn) * 10}px)`,
        }}
      >
        <Card style={{ flex: 1 }}>
          <div style={{ fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: ink[500] }}>
            Understood as
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: ink[950], marginTop: 10 }}>
            Promise to pay
          </div>
          <div style={{ fontSize: 16, color: ink[600], marginTop: 6, lineHeight: 1.5 }}>
            Reminders paused until the promised date. If the money does not arrive, the sequence
            restarts on its own.
          </div>
        </Card>

        <Card style={{ flex: 1 }}>
          <div style={{ fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: ink[500] }}>
            Added to forecast
          </div>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: 34,
              fontWeight: 700,
              color: ink[950],
              marginTop: 8,
            }}
          >
            {money(15_750)}
          </div>
          <div style={{ fontSize: 16, color: ink[600], marginTop: 4 }}>Friday 25 September</div>
        </Card>
      </div>

      <Card
        style={{
          marginTop: 18,
          background: success[100],
          borderColor: success[500],
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 10}px)`,
        }}
      >
        <div style={{ fontSize: 16, color: ink[700], lineHeight: 1.5 }}>
          <b style={{ color: success[700] }}>No one had to read that email.</b> The date came out of
          the sentence, the chase stopped, and next week&apos;s cash number moved — without anybody
          opening the inbox.
        </div>
      </Card>
    </Chrome>
  );
};
