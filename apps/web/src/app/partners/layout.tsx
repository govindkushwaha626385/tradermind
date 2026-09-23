// ──────────────────────────────────────────────
// TradeMind — /partners Layout with SEO Metadata
// ──────────────────────────────────────────────

import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trademind.app';

export const metadata: Metadata = {
  title: 'Partner Brokers & Deals — TradeMind',
  description:
    'Discover zero-brokerage broker accounts, exclusive discounts, and auto-sync compatible trading platforms curated for Indian traders. Zerodha, Upstox, Angel One, Dhan & more.',
  alternates: {
    canonical: `${APP_URL}/partners`,
  },
  openGraph: {
    title: 'Partner Brokers & Exclusive Deals — TradeMind',
    description:
      'Browse zero-brokerage accounts, special discounts, and broker integrations curated by TradeMind for Indian traders.',
    url: `${APP_URL}/partners`,
    siteName: 'TradeMind',
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'TradeMind Partner Brokers & Deals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Partner Brokers & Exclusive Deals — TradeMind',
    description:
      'Zero-brokerage accounts, special discounts, and broker integrations for Indian traders.',
    images: [`${APP_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
