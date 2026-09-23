// ──────────────────────────────────────────────
// TradeMind — User Currency Preference Hook
// Supports strict INR and USD formatting
// ──────────────────────────────────────────────

'use client';

import { useMemo } from 'react';
import { useProfile } from './useProfile';
import { formatCurrency } from '@trademind/shared';

export type ActiveCurrency = 'INR' | 'USD';

export function useCurrency(): {
  currency: ActiveCurrency;
  currencySymbol: string;
  format: (amount: number, overrideCurrency?: string) => string;
} {
  const { data: profile } = useProfile();

  const currency: ActiveCurrency = useMemo(() => {
    const raw = (profile?.preferredCurrency ?? 'INR').toUpperCase();
    return raw === 'USD' ? 'USD' : 'INR';
  }, [profile?.preferredCurrency]);

  const currencySymbol = useMemo(() => {
    return currency === 'USD' ? '$' : '₹';
  }, [currency]);

  const format = useMemo(() => {
    return (amount: number, overrideCurrency?: string) => {
      const active = overrideCurrency ? (overrideCurrency.toUpperCase() === 'USD' ? 'USD' : 'INR') : currency;
      return formatCurrency(amount, active);
    };
  }, [currency]);

  return { currency, currencySymbol, format };
}
