import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PostHogProvider } from '@/components/posthog-provider';
import { Suspense } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Collectly — Get paid 3x faster', template: '%s · Collectly' },
  description: 'AI-native accounts receivable for small businesses. Connect QuickBooks or Xero, and Collectly chases your invoices, predicts cash flow, and helps you get paid in days, not months.',
  keywords: ['accounts receivable', 'AR automation', 'invoice collection', 'cash flow', 'AI dunning', 'small business'],
  openGraph: {
    type: 'website',
    title: 'Collectly — Get paid 3x faster',
    description: 'AI-native accounts receivable for small businesses.',
    siteName: 'Collectly',
  },
  twitter: { card: 'summary_large_image', title: 'Collectly — Get paid 3x faster', description: 'AI-native accounts receivable for small businesses.' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0b0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
