import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Artisan — Find trusted skilled workers near you',
  description:
    'Book verified plumbers, electricians, carpenters, painters, mechanics and cleaners in your area. Real-time chat, transparent pricing, and emergency support.',
  openGraph: {
    title: 'Artisan — Find trusted skilled workers near you',
    description:
      'Verified artisans, transparent prices, and 24/7 emergency response. Download the app and book in seconds.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
