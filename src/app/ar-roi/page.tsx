import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
  redirect('/tools/ar-roi');
}
