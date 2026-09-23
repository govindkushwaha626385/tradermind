// ──────────────────────────────────────────────
// TradeMind — DataTable Component
//
// Shared, styled table used across admin and user
// pages for consistent data display.
// Features:
//   - Desktop: full table with sort, alternating rows
//   - Mobile: card-mode renderer (pass mobileCardRenderer)
//   - Horizontal scroll on tablet
//   - Pagination controls
// ──────────────────────────────────────────────

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  /** Hide this column on mobile (<md) */
  hideOnMobile?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  className?: string;
  loading?: boolean;
  /**
   * If provided, renders each row as a card on mobile (<md).
   * Use this for full custom mobile layout.
   */
  mobileCardRenderer?: (row: T, index: number) => React.ReactNode;
  /** Click handler for rows */
  onRowClick?: (row: T) => void;
}

/** Pagination Controls */
export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  className?: string;
}

function PaginationInner({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/50 text-sm text-muted-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-medium text-foreground">{start}</span>–
          <span className="font-medium text-foreground">{end}</span> of{' '}
          <span className="font-medium text-foreground">{total}</span>
        </span>
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="text-sm px-2 py-1 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>{v} / page</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-input hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ««
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-input hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                pageNum === page
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-accent text-foreground',
              )}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-input hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-input hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          »»
        </button>
      </div>
    </div>
  );
}

export const Pagination = memo(PaginationInner);

/** Main DataTable component */
function DataTableInner<T>({
  columns,
  data,
  keyExtractor,
  sortKey,
  sortOrder,
  onSort,
  emptyMessage = 'No data found.',
  className,
  loading = false,
  mobileCardRenderer,
  onRowClick,
}: DataTableProps<T>) {
  const skeletonRows = 5;

  return (
    <div className={cn('glass-card rounded-2xl overflow-hidden', className)}>
      {/* ── Mobile Card View (< md) ─────────────────────── */}
      {mobileCardRenderer && (
        <div className="md:hidden divide-y divide-border/30">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="skeleton h-4 rounded w-3/4" />
                <div className="skeleton h-3 rounded w-1/2" />
                <div className="skeleton h-3 rounded w-2/3" />
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {emptyMessage}
            </div>
          ) : (
            data.map((row, index) => (
              <div
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && 'cursor-pointer hover:bg-accent/30 active:bg-accent/50 transition-colors')}
              >
                {mobileCardRenderer(row, index)}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Desktop / Tablet Table View (>= md or no mobileCardRenderer) ── */}
      <div className={cn('overflow-x-auto scrollbar-thin', mobileCardRenderer && 'hidden md:block')}>
        <table className="w-full min-w-[640px] text-sm">
          {/* Head */}
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {columns.map((col) => {
                const isActive = sortKey === col.key;
                const SortIcon = isActive
                  ? sortOrder === 'asc' ? ChevronUp : ChevronDown
                  : ChevronsUpDown;

                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                      col.align === 'center' && 'text-center',
                      col.align === 'right'  && 'text-right',
                      !col.align              && 'text-left',
                      col.sortable && 'cursor-pointer hover:text-foreground select-none',
                      col.className,
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div className={cn('inline-flex items-center gap-1', col.align === 'right' && 'flex-row-reverse')}>
                      {col.label}
                      {col.sortable && (
                        <SortIcon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? 'text-primary' : 'opacity-40')} />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-border/30">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="skeleton h-3.5 rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-muted-foreground text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-border/30 last:border-0 transition-colors',
                    index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20',
                    'hover:bg-accent/50',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3.5 text-sm',
                        col.align === 'center' && 'text-center',
                        col.align === 'right'  && 'text-right',
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row, index)
                        : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner;
