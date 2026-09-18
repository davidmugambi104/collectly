import React from 'react';
import { ink, font } from '../theme';

/**
 * The app frame every scene renders inside: sidebar, title bar, sample-data
 * badge. One frame rather than four keeps the video feeling like a continuous
 * session in one product instead of four separate screenshots.
 */
const NAV = ['Overview', 'Inbox', 'Invoices', 'Customers', 'Payments', 'Dunning', 'Cash flow'] as const;

export const Chrome: React.FC<{
  active: (typeof NAV)[number];
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ active, title, subtitle, children }) => (
  <div style={{ display: 'flex', width: '100%', height: '100%', background: ink[50], fontFamily: font.sans }}>
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        background: '#fff',
        borderRight: `1px solid ${ink[200]}`,
        padding: '28px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: ink[950] }} />
        <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 20, color: ink[950] }}>
          Collectly
        </span>
      </div>
      {NAV.map((item) => {
        const on = item === active;
        return (
          <div
            key={item}
            style={{
              padding: '9px 12px',
              marginBottom: 2,
              borderRadius: 8,
              fontSize: 15,
              fontWeight: on ? 600 : 500,
              color: on ? ink[950] : ink[600],
              background: on ? ink[100] : 'transparent',
            }}
          >
            {item}
          </div>
        );
      })}
    </aside>

    <main style={{ flex: 1, padding: '34px 40px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontSize: 34, fontWeight: 600, color: ink[950] }}>
            {title}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 16, color: ink[600] }}>{subtitle}</p>
        </div>
        {/* The dev seed this is modelled on carries a standing rule that it
            must never appear in front of a prospect without a sample-data
            label. A video is front-of-prospect. */}
        <span
          style={{
            fontSize: 12,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: ink[500],
            border: `1px solid ${ink[200]}`,
            borderRadius: 999,
            padding: '5px 11px',
            background: '#fff',
          }}
        >
          Demo data
        </span>
      </div>
      <div style={{ marginTop: 26 }}>{children}</div>
    </main>
  </div>
);
