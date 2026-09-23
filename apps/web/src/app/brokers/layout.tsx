// ──────────────────────────────────────────────
// TradeMind — /brokers Layout with SEO Metadata
// ──────────────────────────────────────────────

import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trademind.app';

export const metadata: Metadata = {
  title: 'Best Indian Stockbrokers & Zero Brokerage Accounts — TradeMind',
  description:
    'Compare and connect the best Indian stock brokers — Zerodha, Upstox, Angel One, Dhan, Groww, Fyers. Get exclusive deals and auto-sync your trades with TradeMind journal.',
  alternates: {
    canonical: `${APP_URL}/brokers`,
  },
  openGraph: {
    title: 'Best Indian Brokers & Zero Brokerage Accounts — TradeMind',
    description:
      'Compare Zerodha, Upstox, Angel One, Dhan, Groww, and Fyers. Get exclusive deals and auto-sync your trades with TradeMind.',
    url: `${APP_URL}/brokers`,
    siteName: 'TradeMind',
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Best Indian Brokers — TradeMind',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Indian Brokers & Zero Brokerage — TradeMind',
    description:
      'Compare Zerodha, Upstox, Angel One, Dhan, Groww & Fyers. Get exclusive deals & auto-sync trades.',
    images: [`${APP_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function BrokersPublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
