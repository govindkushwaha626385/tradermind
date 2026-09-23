// ──────────────────────────────────────────────
// TradeMind — Broker Connections Hook
// ──────────────────────────────────────────────

'use client';

import { useApi } from './useApi';
import { api } from '@/lib/api';
import type { BrokerConnection } from '@trademind/shared';

export function useBrokers() {
  return useApi<BrokerConnection[]>(() => api.getBrokers() as any, []);
}
