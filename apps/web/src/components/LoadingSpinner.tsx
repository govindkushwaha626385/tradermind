// ──────────────────────────────────────────────
// TradeMind — Loading Spinner
//
// A centered spinner used as a Suspense / page
// loading fallback across the dashboard.
// ──────────────────────────────────────────────

import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
