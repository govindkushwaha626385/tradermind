// ──────────────────────────────────────────────
// TradeMind — SectionCard Component
//
// Unified card container used across all dashboard pages.
// Replaces inconsistent ad-hoc glass-card divs with a
// standardised, accessible, and styled card wrapper.
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconGradient?: string;
  badge?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
  /** Render a coloured left-border accent */
  accent?: 'profit' | 'loss' | 'brand' | 'warning' | 'none';
}

const ACCENT_MAP = {
  profit:  'border-l-4 border-l-profit',
  loss:    'border-l-4 border-l-loss',
  brand:   'border-l-4 border-l-primary',
  warning: 'border-l-4 border-l-warning',
  none:    '',
};

export function SectionCard({
  title,
  description,
  icon: Icon,
  iconGradient = 'from-blue-500 to-violet-500',
  badge,
  headerRight,
  children,
  className,
  bodyClassName,
  noPadding = false,
  accent = 'none',
}: SectionCardProps) {
  const hasHeader = title || description || Icon || badge || headerRight;

  return (
    <div
      className={cn(
        'glass-card rounded-2xl shadow-card transition-shadow duration-200 hover:shadow-card-lg',
        ACCENT_MAP[accent],
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div
                className={cn(
                  'flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center',
                  iconGradient,
                )}
              >
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground leading-tight truncate">
                    {title}
                  </h2>
                  {badge}
                </div>
              )}
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {description}
                </p>
              )}
            </div>
          </div>
          {headerRight && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {headerRight}
            </div>
          )}
        </div>
      )}

      <div className={cn(noPadding ? '' : 'p-5', hasHeader && !noPadding && 'pt-4', bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
