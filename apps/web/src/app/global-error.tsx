// ──────────────────────────────────────────────
// TradeMind — Global Error Boundary
//
// Next.js requires this file at the root of the app
// directory for production error recovery.
// Only renders when the root layout itself crashes.
// ──────────────────────────────────────────────

'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-950 dark:to-slate-950 p-6">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-destructive">!</span>
          </div>
          <h1 className="text-xl font-bold">Critical Error</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
