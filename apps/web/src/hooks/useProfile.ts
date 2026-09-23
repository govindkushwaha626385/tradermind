// ──────────────────────────────────────────────
// TradeMind — User Profile Hook
// ──────────────────────────────────────────────

'use client';

import { useApi } from './useApi';
import { api } from '@/lib/api';

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  plan?: { name: string; slug: string } | null;
  subscription?: { planSlug: string } | null;
  avatarUrl?: string | null;
  preferredCurrency?: string;
  timezone?: string;
}

export function useProfile() {
  return useApi<ProfileData>(() => api.getProfile() as any, []);
}
