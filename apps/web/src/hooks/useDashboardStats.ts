// ──────────────────────────────────────────────
// TradeMind — Dashboard Stats Hook
// ──────────────────────────────────────────────

'use client';

import { useApi } from './useApi';
import { api } from '@/lib/api';
import type { DashboardStats } from '@trademind/shared';

export function useDashboardStats(timeframe: string) {
  return useApi<DashboardStats>(() => api.getDashboard(timeframe ? { timeframe } : undefined) as any, [timeframe]);
}
