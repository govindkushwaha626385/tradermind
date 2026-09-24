// ──────────────────────────────────────────────
// TradeMind — User Currency Preference Hook
// Supports Global Currencies: INR, USD, EUR, GBP, USDT, BTC
// Synchronizes with localStorage & backend user profile
// ──────────────────────────────────────────────

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProfile } from './useProfile';
import { formatCurrency } from '@trademind/shared';
import { api } from '@/lib/api';

export type ActiveCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'USDT' | 'BTC';

export const CURRENCY_SYMBOLS: Record<ActiveCurrency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  USDT: '₮',
  BTC: '₿',
};

export const SUPPORTED_CURRENCIES: Array<{ code: ActiveCurrency; symbol: string; label: string }> = [
  { code: 'INR', symbol: '₹', label: 'INR (₹) Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'USD ($) US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) British Pound' },
  { code: 'USDT', symbol: '₮', label: 'USDT (₮) Tether' },
  { code: 'BTC', symbol: '₿', label: 'BTC (₿) Bitcoin' },
];

export function useCurrency(): {
  currency: ActiveCurrency;
  currencySymbol: string;
  setCurrency: (c: ActiveCurrency) => void;
  format: (amount: number, overrideCurrency?: string) => string;
} {
  const { data: profile } = useProfile();
  const [localCurrency, setLocalCurrency] = useState<ActiveCurrency>('INR');

  useEffect(() => {
    // 1. Check localStorage first
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('trademind_currency') as ActiveCurrency | null) : null;
    if (stored && CURRENCY_SYMBOLS[stored]) {
      setLocalCurrency(stored);
      return;
    }

    // 2. Fallback to profile
    if (profile?.preferredCurrency) {
      const p = profile.preferredCurrency.toUpperCase() as ActiveCurrency;
      if (CURRENCY_SYMBOLS[p]) {
        setLocalCurrency(p);
      }
    }
  }, [profile?.preferredCurrency]);

  // Listen to cross-tab / cross-component storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'trademind_currency' && e.newValue) {
        const next = e.newValue as ActiveCurrency;
        if (CURRENCY_SYMBOLS[next]) {
          setLocalCurrency(next);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setCurrency = useCallback((nextCurrency: ActiveCurrency) => {
    setLocalCurrency(nextCurrency);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trademind_currency', nextCurrency);
      window.dispatchEvent(new Event('currency-change'));
    }
    // Async persist to profile
    api.updateProfile({ preferredCurrency: nextCurrency }).catch(() => {});
  }, []);

  // Listen to local window events
  useEffect(() => {
    const handleLocalChange = () => {
      const stored = localStorage.getItem('trademind_currency') as ActiveCurrency | null;
      if (stored && CURRENCY_SYMBOLS[stored]) {
        setLocalCurrency(stored);
      }
    };
    window.addEventListener('currency-change', handleLocalChange);
    return () => window.removeEventListener('currency-change', handleLocalChange);
  }, []);

  const currencySymbol = useMemo(() => CURRENCY_SYMBOLS[localCurrency] || '₹', [localCurrency]);

  const format = useMemo(() => {
    return (amount: number, overrideCurrency?: string) => {
      const active = overrideCurrency || localCurrency;
      return formatCurrency(amount, active);
    };
  }, [localCurrency]);

  return { currency: localCurrency, currencySymbol, setCurrency, format };
}
