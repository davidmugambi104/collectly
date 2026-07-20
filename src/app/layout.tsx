import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PostHogProvider } from '@/components/posthog-provider';
import { ClerkProvider } from '@/components/clerk-provider';
import { Suspense } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Collectly — stop being the one who has to ask', template: '%s · Collectly' },
  description: 'Collectly follows up on overdue invoices the way a thoughtful operations person would — adapting tone to context, escalating when appropriate, tracking promises to pay, and keeping you out of the uncomfortable parts. Built for small B2B service businesses on QBO or Xero.',
  keywords: ['accounts receivable','AR automation','invoice collection','cash flow','AI dunning','small business','late invoice follow-up','payment chasing'],
  openGraph: {
    type: 'website',
    title: 'Collectly — stop being the one who has to ask',
    description: 'Collectly follows up on overdue invoices the way a thoughtful operations person would. Built for small B2B service businesses.',
    siteName: 'Collectly',
  },
  twitter: { card: 'summary_large_image', title: 'Collectly — stop being the one who has to ask', description: 'AI-native accounts receivable that handles the awkward parts. For small B2B service businesses on QBO or Xero.' },
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
        <ClerkProvider>
          <Suspense>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </ClerkProvider>
      </body>
    </html>
  );
}
