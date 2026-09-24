// ──────────────────────────────────────────────
// TradeMind — PageHeader Component
//
// Unified page header used across all dashboard pages.
// Provides consistent h1, description, optional breadcrumb,
// live-data badge, and a right-side action slot.
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';
import { LiveDot } from './LiveDot';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  badge?: string;
  live?: boolean;
  lastUpdated?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
  badge,
  live = false,
  lastUpdated,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <svg className="w-3 h-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-xs font-medium text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Header row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-brand">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground leading-tight tracking-tight">
                {title}
              </h1>
              {badge && (
                <span className="badge badge-brand">{badge}</span>
              )}
              {live && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <LiveDot size="sm" />
                  Live
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                {description}
              </p>
            )}
            {lastUpdated && (
              <p className="text-2xs text-muted-foreground/60 mt-1">
                Updated {lastUpdated}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
