import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { Aging } from './scenes/Aging';
import { Dunning } from './scenes/Dunning';
import { Promise as PromiseScene } from './scenes/Promise';
import { Forecast } from './scenes/Forecast';
import { ink, brand, font } from './theme';

export const FPS = 30;

/**
 * Scene lengths in seconds. Dunning gets the most because it is the only
 * scene with prose the viewer has to actually read; the others are figures
 * and shapes, which land faster.
 */
const SCENES = [
  { id: 'aging', seconds: 16, Component: Aging, caption: 'Every unpaid invoice, oldest first' },
  { id: 'dunning', seconds: 22, Component: Dunning, caption: 'Follow-ups written in your tone' },
  { id: 'promise', seconds: 17, Component: PromiseScene, caption: 'Promises become dates' },
  { id: 'forecast', seconds: 18, Component: Forecast, caption: 'Four weeks of cash, before it lands' },
] as const;

export const TOTAL_FRAMES = SCENES.reduce((s, x) => s + x.seconds * FPS, 0);

const CROSSFADE = 12;

/** Lower-third caption naming what the viewer is looking at. */
const Caption: React.FC<{ text: string; durationInFrames: number }> = ({ text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [6, 22, durationInFrames - 26, durationInFrames - 12],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: 300,
        bottom: 44,
        opacity,
        background: ink[950],
        color: '#fff',
        fontFamily: font.sans,
        fontSize: 20,
        fontWeight: 500,
        padding: '13px 22px',
        borderRadius: 10,
        borderLeft: `3px solid ${brand[500]}`,
      }}
    >
      {text}
    </div>
  );
};

/** Fades a scene in and out so cuts are not hard. */
const Fade: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, CROSSFADE, durationInFrames - CROSSFADE, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const DemoWalkthrough: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  let at = 0;

  return (
    <AbsoluteFill style={{ background: ink[50] }}>
      {SCENES.map(({ id, seconds, Component, caption }) => {
        const from = at;
        const len = seconds * FPS;
        at += len;
        return (
          <Sequence key={id} from={from} durationInFrames={len}>
            <Fade durationInFrames={len}>
              <Component />
              <Caption text={caption} durationInFrames={len} />
            </Fade>
          </Sequence>
        );
      })}

      {/* Closing card. Deliberately says what the product does and where to
          find it — no metric, no testimonial, nothing the site could not
          back up. */}
      <Sequence from={durationInFrames - 3 * FPS} durationInFrames={3 * FPS}>
        <Fade durationInFrames={3 * FPS}>
          <AbsoluteFill
            style={{
              background: ink[950],
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <div style={{ fontFamily: font.display, fontSize: 62, fontWeight: 700, color: '#fff' }}>
              Collectly
            </div>
            <div style={{ fontFamily: font.sans, fontSize: 25, color: ink[300], marginTop: 14 }}>
              Stop chasing late invoices.
            </div>
            <div style={{ fontFamily: font.sans, fontSize: 21, color: brand[300], marginTop: 30 }}>
              getcollectly.app
            </div>
          </AbsoluteFill>
        </Fade>
      </Sequence>
    </AbsoluteFill>
  );
};
