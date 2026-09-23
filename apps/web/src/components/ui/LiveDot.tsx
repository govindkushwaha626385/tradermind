// ──────────────────────────────────────────────
// TradeMind — LiveDot Component
//
// Animated pulsing dot for real-time data indicators.
// Use it next to "Live" labels, syncing status, etc.
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';

type LiveDotSize = 'sm' | 'md' | 'lg';
type LiveDotColor = 'success' | 'warning' | 'destructive' | 'info';

interface LiveDotProps {
  size?: LiveDotSize;
  color?: LiveDotColor;
  className?: string;
}

const SIZE_MAP: Record<LiveDotSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

const COLOR_MAP: Record<LiveDotColor, string> = {
  success:     'bg-success',
  warning:     'bg-warning',
  destructive: 'bg-destructive',
  info:        'bg-info',
};

const GLOW_MAP: Record<LiveDotColor, string> = {
  success:     '[box-shadow:0_0_0_0_hsl(var(--success)/0.5)]',
  warning:     '[box-shadow:0_0_0_0_hsl(var(--warning)/0.5)]',
  destructive: '[box-shadow:0_0_0_0_hsl(var(--destructive)/0.5)]',
  info:        '[box-shadow:0_0_0_0_hsl(var(--info)/0.5)]',
};

export function LiveDot({
  size = 'md',
  color = 'success',
  className,
}: LiveDotProps) {
  return (
    <span
      className={cn(
        'inline-block flex-shrink-0 rounded-full',
        SIZE_MAP[size],
        COLOR_MAP[color],
        'animate-[livePulse_1.8s_cubic-bezier(0.4,0,0.6,1)_infinite]',
        className,
      )}
      aria-label="Live indicator"
    />
  );
}
