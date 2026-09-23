// ──────────────────────────────────────────────
// TradeMind — Journal Trades Hook (paginated)
// ──────────────────────────────────────────────

'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface UseJournalTradesOptions {
  limit?: number;
  filters?: {
    search?: string;
    emotion?: string;
    startDate?: string;
    endDate?: string;
    direction?: string;
  };
}

export function useJournalTrades(options: UseJournalTradesOptions = {}) {
  const { limit = 20, filters = {} } = options;
  const [data, setData]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [cursor, setCursor]           = useState<string | undefined>(undefined);
  const [error, setError]             = useState<string | null>(null);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await (api as any).getJournalTrades({
        limit,
        cursor: reset ? undefined : cursor,
        ...filters,
      });
      if (res.success) {
        const items = res.data ?? [];
        setData((prev) => reset ? items : [...prev, ...items]);
        setCursor(res.nextCursor ?? undefined);
        setHasMore(!!res.nextCursor && items.length === limit);
      } else {
        setError(res.error?.message ?? 'Failed to load trades');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [cursor, filters, limit]);

  const reset = useCallback(() => {
    setCursor(undefined);
    setData([]);
    setHasMore(true);
    load(true);
  }, [load]);

  return { data, loading, error, hasMore, loadMore: () => load(false), reset };
}
