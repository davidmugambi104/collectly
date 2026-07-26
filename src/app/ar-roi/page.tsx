import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'A/R ROI Calculator — Collectly',
  description: 'Free calculator: see how much faster invoicing would free up for your service business.',
};

export default function ArRoiRedirect() {
  redirect('/tools/ar-roi');
}
