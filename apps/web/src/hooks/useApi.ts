// ──────────────────────────────────────────────
// TradeMind — Generic API Data Hook
// Eliminates useState+useEffect+api boilerplate.
// ──────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseApiOptions {
  /** If false, don't fetch automatically on mount */
  enabled?: boolean;
  /** Refetch interval in ms (0 = no auto-refetch) */
  refetchInterval?: number;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic hook for data fetching with loading, error, and refetch.
 * 
 * @example
 * const { data: stats, loading } = useApi(() => api.getDashboardStats(), [timeframe]);
 */
export function useApi<T>(
  fetchFn: () => Promise<{ success: boolean; data: T; error?: { message: string } }>,
  deps: unknown[] = [],
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { enabled = true, refetchInterval = 0 } = options;
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError]     = useState<string | null>(null);
  const mountedRef             = useRef(true);

  const fetch = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn();
      if (!mountedRef.current) return;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error?.message ?? 'An unexpected error occurred');
      }
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      const msg = e instanceof Error ? e.message : 'Failed to load data';
      setError(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) fetch();
    return () => { mountedRef.current = false; };
  }, [fetch, enabled]);

  // Auto-refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;
    const id = setInterval(() => { if (mountedRef.current) fetch(); }, refetchInterval);
    return () => clearInterval(id);
  }, [fetch, refetchInterval, enabled]);

  return { data, loading, error, refetch: fetch };
}
