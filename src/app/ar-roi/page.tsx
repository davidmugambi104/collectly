import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'A/R ROI calculator — see how much faster invoicing could free up',
  description:
    'Free A/R ROI calculator for small agencies and consultancies. ' +
    'See how much faster invoicing could free up your cash, with the ' +
    'actual numbers — not a generic formula.',
  path: '/ar-roi',
  keywords: ['AR ROI', 'invoice ROI', 'cash flow calculator', 'DSO calculator'],
});

export default function ArRoiRedirect() {
  // Was next/navigation's redirect() (temporary, 307) — this is a
  // permanent URL alias, not a transient bounce, and sitemap.ts was
  // telling Googlebot to prioritize-crawl this exact URL while it 307'd
  // to a page with no canonical of its own. permanentRedirect (308)
  // correctly signals "this moved for good" and passes link equity to
  // the real destination.
  permanentRedirect('/tools/ar-roi');
}
