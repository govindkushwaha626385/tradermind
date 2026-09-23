// ──────────────────────────────────────────────
// TradeMind — Root Layout & Global Providers
// ──────────────────────────────────────────────

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { APP_NAME, APP_DESCRIPTION } from '@trademind/shared';
import '../styles/globals.css';
import { cn } from '@/lib/utils';
import { ClientLayout } from './client-layout';

/** Load Inter with next/font for zero FOUT and automatic subsetting. */
const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** Load Plus Jakarta Sans as premium display/heading font. */
const fontJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

/** Load JetBrains Mono for code/metrics display. */
const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const rawAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '') : '') ||
  'https://trademind.app';

let appMetadataBase: URL;
try {
  appMetadataBase = new URL(rawAppUrl.startsWith('http') ? rawAppUrl : `https://${rawAppUrl}`);
} catch {
  appMetadataBase = new URL('https://trademind.app');
}

const APP_URL = rawAppUrl;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: appMetadataBase,
  title: {
    default: `${APP_NAME} — Automated Trading Journal`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  keywords: [
    'trading journal',
    'trade analytics',
    'behavioral analysis',
    'broker sync',
    'Indian stock market',
    'Zerodha journal',
    'Dhan journal',
    'F&O trading',
    'intraday journal',
    'discipline score',
    'MFE MAE trading',
    'NSE BSE options trading',
  ],
  authors: [{ name: 'TradeMind' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: `${APP_NAME} — Automated Trading Journal for Indian Traders`,
    description: APP_DESCRIPTION,
    url: APP_URL,
    siteName: APP_NAME,
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} Trading Journal Dashboard`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Automated Trading Journal`,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    operatingSystem: 'Web',
    applicationCategory: 'FinanceApplication',
    description: APP_DESCRIPTION,
    url: APP_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={cn(
          'min-h-screen',
          fontInter.variable,
          fontJakarta.variable,
          fontMono.variable,
        )}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
