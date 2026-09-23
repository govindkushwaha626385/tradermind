// ──────────────────────────────────────────────
// TradeMind — Sitemap
//
// Only public-facing pages should be indexed.
// Dashboard, admin, and auth pages should NOT be
// in the sitemap as they require authentication.
// ──────────────────────────────────────────────

import type { MetadataRoute } from 'next';

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ??
  'https://trademind.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Landing & public marketing pages ───────
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/calculators`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/store`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },

    {
      url: `${APP_URL}/partners`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${APP_URL}/brokers`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.75,
    },

    // ── Auth pages ──────────────────────────────
    {
      url: `${APP_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/forgot-password`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },

    // NOTE: /dashboard, /admin, and all sub-routes are intentionally
    // excluded — they are gated by authentication and would return 401
    // when crawled, wasting crawl budget.
  ];
}
