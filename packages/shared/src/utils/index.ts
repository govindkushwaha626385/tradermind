// ──────────────────────────────────────────────
// TradeMind — Shared Utility Functions
//
// Pure, runtime-independent helpers.
// Cryptographic hashing lives in @trademind/database/src/lib/encryption.ts
// ──────────────────────────────────────────────

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Safely parse a JSON string, returning `fallback` on failure.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Format a number as currency (supports INR and USD).
 *
 * @example formatCurrency(184750, 'INR') // "₹1,84,750.00"
 * @example formatCurrency(184750, 'USD') // "$184,750.00"
 */
export function formatCurrency(amount: number, currency: 'INR' | 'USD' | string = 'INR'): string {
  const curr = (currency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR';
  const locale = curr === 'USD' ? 'en-US' : 'en-IN';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a decimal ratio as a signed percentage string.
 *   0.62  →  "+62.00%"
 *  -0.1   →  "-10.00%"
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(2)}%`;
}

/**
 * Format an already-percentage number (e.g. 62.3) as "62.30%".
 * Use this when the value is already a human-readable percentage.
 */
export function formatPercentDisplay(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Calculate the weighted average price from two lots.
 */
export function weightedAverage(
  currentQty: number,
  currentPrice: number,
  newQty: number,
  newPrice: number,
): number {
  const totalQty = currentQty + newQty;
  if (totalQty === 0) return 0;
  return (currentQty * currentPrice + newQty * newPrice) / totalQty;
}

/**
 * Calculate R-multiple (Net P&L / Initial Risk).
 */
export function calculateRMultiple(netPnl: number, initialRisk: number): number {
  if (initialRisk === 0) return 0;
  return netPnl / initialRisk;
}

/**
 * Generate a UUID v4 using Web Crypto API, or a Math-based fallback.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

