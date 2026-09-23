// ──────────────────────────────────────────────
// TradeMind — Badge Component
//
// Semantic badge/tag chip with multiple variants.
// Used for status indicators, plan tiers, P&L direction,
// trade type labels, etc.
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type BadgeVariant =
  | 'profit'
  | 'loss'
  | 'neutral'
  | 'brand'
  | 'warning'
  | 'gold'
  | 'info'
  | 'destructive'
  | 'success'
  | 'outline'
  | 'ghost';

export type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  profit:      'bg-profit-subtle text-profit border border-profit-border',
  loss:        'bg-loss-subtle text-loss border border-loss-border',
  neutral:     'bg-muted text-muted-foreground border border-border',
  brand:       'bg-primary-subtle text-primary border border-primary-border',
  warning:     'bg-warning/10 text-warning border border-warning/30',
  gold:        'bg-[hsl(38_90%_50%/0.12)] text-[hsl(38_90%_50%)] border border-[hsl(38_90%_50%/0.3)]',
  info:        'bg-info/10 text-info border border-info/30',
  destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
  success:     'bg-success/10 text-success border border-success/20',
  outline:     'bg-transparent text-foreground border border-border',
  ghost:       'bg-transparent text-muted-foreground border-none',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  xs: 'text-[0.625rem] px-1.5 py-0 gap-1 font-semibold',
  sm: 'text-[0.6875rem] px-2 py-0.5 gap-1 font-semibold',
  md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  profit:      'bg-profit',
  loss:        'bg-loss',
  neutral:     'bg-muted-foreground',
  brand:       'bg-primary',
  warning:     'bg-warning',
  gold:        'bg-[hsl(38_90%_50%)]',
  info:        'bg-info',
  destructive: 'bg-destructive',
  success:     'bg-success',
  outline:     'bg-foreground',
  ghost:       'bg-muted-foreground',
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  icon: Icon,
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full whitespace-nowrap leading-none',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
    >
      {dot && (
        <span className={cn('rounded-full flex-shrink-0', size === 'xs' ? 'w-1 h-1' : 'w-1.5 h-1.5', DOT_COLORS[variant])} />
      )}
      {Icon && <Icon className={cn('flex-shrink-0', size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
      {children}
    </span>
  );
}
