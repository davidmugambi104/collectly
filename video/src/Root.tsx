import React from 'react';
import { Composition } from 'remotion';
import { DemoWalkthrough, FPS, TOTAL_FRAMES } from './Composition';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DemoWalkthrough"
    component={DemoWalkthrough}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
