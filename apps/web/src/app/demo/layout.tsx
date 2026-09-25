// ──────────────────────────────────────────────
// TradeMind — /demo Layout with SEO Metadata
// ──────────────────────────────────────────────

import type { Metadata } from 'next';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://trademind.app';

export const metadata: Metadata = {
  title: 'Interactive Trading Journal Sandbox Demo — Try Without Signup | TradeMind',
  description:
    'Test drive TradeMind with zero signup required. Experience institutional TradingView candlestick replay (v5.2.1), 1-click AI trade autopsy, behavioral risk analysis, and multi-currency metrics live.',
  keywords: [
    'free trading journal demo',
    'try trading journal without signup',
    'tradezella demo alternative',
    'tradingview replay demo',
    'ai trade autopsy online',
    'options trading journal simulator',
    'crypto trade log demo',
  ],
  alternates: {
    canonical: `${APP_URL}/demo`,
  },
  openGraph: {
    title: 'Interactive Trading Journal Sandbox Demo — TradeMind',
    description:
      'Experience bar-by-bar TradingView replay, 1-click AI trade autopsy, and institutional analytics live without creating an account.',
    url: `${APP_URL}/demo`,
    siteName: 'TradeMind',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interactive Trading Journal Sandbox Demo — TradeMind',
    description:
      'Test drive TradeMind with zero signup. Real-time candlestick replay and AI trade autopsy.',
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
