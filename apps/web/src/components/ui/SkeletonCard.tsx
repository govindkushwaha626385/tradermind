// ──────────────────────────────────────────────
// TradeMind — SkeletonCard Component
//
// Reusable shimmer skeleton for loading states.
// Prevents layout shifts by matching the shape of
// the actual content card being loaded.
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Single shimmer block */
export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn('skeleton', className)} style={style} />;
}

interface SkeletonCardProps {
  rows?: number;
  className?: string;
  showHeader?: boolean;
  showAvatar?: boolean;
}

// Deterministic widths cycling array — avoids Math.random() which
// causes inconsistent skeleton shapes on every re-render.
const SKEL_WIDTHS = ['72%', '85%', '60%', '90%', '55%', '78%', '65%', '80%'];

/** Full card skeleton — matches a glass-card layout */
export function SkeletonCard({
  rows = 3,
  className,
  showHeader = true,
  showAvatar = false,
}: SkeletonCardProps) {
  return (
    <div className={cn('glass-card rounded-2xl p-5 space-y-4 overflow-hidden', className)}>
      {showHeader && (
        <div className="flex items-center gap-3">
          {showAvatar && <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: SKEL_WIDTHS[i % SKEL_WIDTHS.length] }} />
        ))}
      </div>
    </div>
  );
}

// ── Static Tailwind grid classes — dynamic `grid-cols-${count}` gets
//    purged by Tailwind's tree-shaker at build time, so we use a
//    lookup object with all variants pre-declared.
const GRID_COLS_MAP: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-4',
};

/** Row of stat skeleton cards (matches dashboard stat row) */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  const gridClass = GRID_COLS_MAP[count] ?? 'grid-cols-2 lg:grid-cols-4';
  return (
    <div className={`grid ${gridClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="w-9 h-9 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Table row skeletons */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-3 border-b border-border/50 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-3/4" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="px-5 py-3.5 border-b border-border/30 grid gap-4 last:border-0"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-3"
              style={{ width: SKEL_WIDTHS[(i * cols + j) % SKEL_WIDTHS.length] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
