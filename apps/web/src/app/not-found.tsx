// ──────────────────────────────────────────────
// TradeMind — 404 Page
// ──────────────────────────────────────────────

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-950 dark:to-slate-950">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold gradient-text">404</div>
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground">This page doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
