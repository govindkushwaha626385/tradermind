import type { MetadataRoute } from 'next';

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ??
  'https://trademind.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/dashboard/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
