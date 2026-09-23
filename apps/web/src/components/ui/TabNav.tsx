// ──────────────────────────────────────────────
// TradeMind — TabNav Component
//
// Premium pill-style tab navigation reused across
// Analytics, Journal, Settings, and sub-pages.
// Supports icons, badge counts, and scroll overflow.
// ──────────────────────────────────────────────

'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  disabled?: boolean;
}

interface TabNavProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  /** 'pills' = filled pill bg (default), 'underline' = bottom border style */
  variant?: 'pills' | 'underline' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
}

const SIZE_MAP = {
  sm: 'text-xs gap-1 px-3 py-1.5',
  md: 'text-sm gap-1.5 px-4 py-2',
  lg: 'text-base gap-2 px-5 py-2.5',
};

const ICON_SIZE_MAP = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-4.5 h-4.5',
};

export function TabNav({
  tabs,
  active,
  onChange,
  variant = 'pills',
  size = 'md',
  className,
  children,
}: TabNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const containerStyles = cn(
    'flex items-center gap-1',
    variant === 'pills' && 'p-1 bg-muted rounded-xl',
    variant === 'soft'  && 'p-1 bg-surface-1 border border-border rounded-xl',
    variant === 'underline' && 'border-b border-border gap-0',
    className,
  );

  const tabStyles = (tab: TabItem) => {
    const isActive = tab.id === active;
    return cn(
      'inline-flex items-center font-medium rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer select-none',
      SIZE_MAP[size],
      tab.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
      variant === 'pills' && [
        isActive
          ? 'bg-background text-foreground font-semibold shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
      ],
      variant === 'soft' && [
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-2',
      ],
      variant === 'underline' && [
        'rounded-none border-b-2 px-4 py-3',
        isActive
          ? 'border-primary text-foreground font-semibold'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
      ],
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 overflow-hidden">
      <div
        ref={containerRef}
        className={cn(containerStyles, 'overflow-x-auto no-scrollbar flex-1')}
        role="tablist"
        aria-label="Navigation tabs"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={tab.id === active}
              aria-disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={tabStyles(tab)}
            >
              {Icon && <Icon className={ICON_SIZE_MAP[size]} />}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'ml-1 inline-flex items-center justify-center rounded-full font-semibold',
                    tab.id === active
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted-foreground/15 text-muted-foreground',
                    size === 'sm' ? 'text-[0.5rem] px-1 min-w-[14px] h-[14px]' : 'text-[0.625rem] px-1.5 min-w-[18px] h-[18px]',
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
}
