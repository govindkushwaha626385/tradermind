// ──────────────────────────────────────────────
// TradeMind — Admin Billing Loading Skeleton
// ──────────────────────────────────────────────

export default function AdminBillingLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-6xl">
      <div className="h-8 w-48 rounded-lg bg-accent/60" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 space-y-2">
            <div className="h-3 w-24 rounded bg-accent/60" />
            <div className="h-7 w-32 rounded bg-accent/60" />
            <div className="h-3 w-16 rounded bg-accent/40" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-3">
          <div className="h-4 w-40 rounded bg-accent/60" />
          <div className="h-48 rounded-xl bg-accent/40" />
        </div>
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <div className="h-4 w-32 rounded bg-accent/60" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-accent/60" />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-20 rounded bg-accent/60" />
                <div className="h-2 w-full rounded bg-accent/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
