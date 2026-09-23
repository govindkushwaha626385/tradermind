import type { NextConfig } from 'next';
import path from 'path';

/** Absolute path to the trademind monorepo root (two levels up from this file). */
const monorepoRoot = path.resolve(__dirname, '../..');

// ── Bundle Analyzer (optional, run with ANALYZE=true) ──
// Inline conditional — no wrapper needed for optional plugin.
// To analyze: ANALYZE=true next build

const nextConfig: NextConfig = {
  transpilePackages: [
    '@trademind/shared',
    '@trademind/database',
    '@trademind/config',
  ],
  // Explicitly tell Next.js where the monorepo root is so it can resolve
  // the correct lockfile and workspace packages.
  outputFileTracingRoot: monorepoRoot,
  // Point Next.js at the correct app/ directory inside the web workspace.
  distDir: '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    // Tree-shake large packages for faster cold starts and smaller bundles
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // ── Security & Caching headers ──────────────────────
  async headers() {
    return [
      // Global Security Headers for all routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss: http: ws:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      // Caching headers for static media
      {
        source: '/:path*.(ico|png|jpg|jpeg|gif|svg|webp|woff2?)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Caching headers for compiled JS / CSS
      {
        source: '/:path*.(js|css)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Caching headers for JSON & XML manifests
      {
        source: '/:path*.(json|xml)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
