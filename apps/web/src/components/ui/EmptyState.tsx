// ──────────────────────────────────────────────
// TradeMind — EmptyState Component
//
// Premium empty state with SVG illustration,
// title, description, and optional CTA button.
// Used across journal, trades, insights, etc.
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-10 px-6' : 'py-16 px-8',
        className,
      )}
    >
      {/* Illustration bubble */}
      <div className="relative mb-6">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/10 blur-xl scale-150" />
        {/* Icon container */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 flex items-center justify-center shadow-card">
          {Icon ? (
            <Icon className="w-9 h-9 text-primary/60" />
          ) : (
            /* Default: abstract chart lines SVG */
            <svg
              className="w-9 h-9 text-primary/60"
              viewBox="0 0 36 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 28 L10 18 L16 22 L22 10 L28 14 L32 8" />
              <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" opacity="0.5" />
              <circle cx="22" cy="10" r="2" fill="currentColor" stroke="none" opacity="0.5" />
              <rect x="4" y="30" width="28" height="1.5" rx="0.75" fill="currentColor" stroke="none" opacity="0.3" />
            </svg>
          )}
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400/40 animate-pulse-slow" />
        <div className="absolute -bottom-2 -left-2 w-2 h-2 rounded-full bg-violet-400/40 animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <h3 className={cn('font-semibold text-foreground', compact ? 'text-base' : 'text-lg')}>
        {title}
      </h3>

      {description && (
        <p className={cn('text-muted-foreground mt-1.5 max-w-sm leading-relaxed', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}

      {action && (
        <div className="mt-5">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
