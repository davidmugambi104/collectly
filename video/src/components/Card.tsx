import React from 'react';
import { ink } from '../theme';

/** The app's card: 1px border, 12px radius, white, no shadow. */
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      background: '#fff',
      border: `1px solid ${ink[200]}`,
      borderRadius: 12,
      padding: 22,
      ...style,
    }}
  >
    {children}
  </div>
);
