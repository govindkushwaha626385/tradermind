// ──────────────────────────────────────────────
// TradeMind — Tax & Fee Engine Tests
//
// Tests fee calculation with known rates.
// Since calculateFees() reads from DB + config,
// we mock the database and config manager.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock dependencies ─────────────────────────
const mockTaxRates: any[] = [
  // STT rates
  { id: '1', name: 'STT - Equity Intraday (Sell)', segment: 'EQUITY', transactionType: 'SELL', rateType: 'percentage', rateValue: 0.00025, appliedOn: 'sell', isActive: true, priority: 1 },
  { id: '2', name: 'STT - Equity Delivery (Buy)', segment: 'EQUITY', transactionType: 'BUY', rateType: 'percentage', rateValue: 0.001, appliedOn: 'buy', isActive: true, priority: 1 },
  { id: '3', name: 'STT - Equity Delivery (Sell)', segment: 'EQUITY', transactionType: 'SELL', rateType: 'percentage', rateValue: 0.001, appliedOn: 'sell', isActive: true, priority: 1 },
  { id: '4', name: 'STT - Futures (Sell)', segment: 'FNO', transactionType: 'SELL', rateType: 'percentage', rateValue: 0.0002, appliedOn: 'sell', isActive: true, priority: 1 },
  { id: '5', name: 'STT - Options Premium (Sell)', segment: 'FNO', transactionType: 'SELL', rateType: 'percentage', rateValue: 0.001, appliedOn: 'sell', isActive: true, priority: 1 },
  { id: '6', name: 'STT - Options Exercise', segment: 'FNO', transactionType: 'BUY', rateType: 'percentage', rateValue: 0.00125, appliedOn: 'buy', isActive: true, priority: 2 },

  // Exchange turnover
  { id: '7', name: 'Exchange Turnover - Equity', segment: 'EQUITY', transactionType: null, rateType: 'percentage', rateValue: 0.0000297, appliedOn: 'both', isActive: true, priority: 3 },
  { id: '8', name: 'Exchange Turnover - Futures', segment: 'FNO', transactionType: null, rateType: 'percentage', rateValue: 0.0000197, appliedOn: 'both', isActive: true, priority: 3 },
  { id: '9', name: 'Exchange Turnover - Options', segment: 'FNO', transactionType: null, rateType: 'percentage', rateValue: 0.0003503, appliedOn: 'both', isActive: true, priority: 3 },

  // Stamp duty
  { id: '10', name: 'Stamp Duty - Equity Delivery', segment: 'EQUITY', transactionType: 'BUY', rateType: 'percentage', rateValue: 0.00015, appliedOn: 'buy', isActive: true, priority: 4 },
  { id: '11', name: 'Stamp Duty - Equity Intraday', segment: 'EQUITY', transactionType: 'BUY', rateType: 'percentage', rateValue: 0.00003, appliedOn: 'buy', isActive: true, priority: 4 },
  { id: '12', name: 'Stamp Duty - Futures', segment: 'FNO', transactionType: 'BUY', rateType: 'percentage', rateValue: 0.00002, appliedOn: 'buy', isActive: true, priority: 4 },
  { id: '13', name: 'Stamp Duty - Options', segment: 'FNO', transactionType: 'BUY', rateType: 'percentage', rateValue: 0.00003, appliedOn: 'buy', isActive: true, priority: 4 },
];

const mockConfigValues: Record<string, number> = {
  'fees.gst_rate': 0.18,
  'fees.brokerage_flat_per_order': 20,
  'fees.brokerage_percentage': 0.0003,
  'fees.sebi_turnover_fee_per_crore': 1050,
};

// ── Mock database with segment filtering ──
// We control which rates are returned per test by setting this
let mockSegmentFilter: string | null = null;
let mockReturnedRates: any[] = [];

vi.mock('@trademind/database', () => ({
  getDatabase: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => {
            const rates = mockSegmentFilter
              ? mockTaxRates.filter((r) => r.isActive && r.segment === mockSegmentFilter)
              : mockTaxRates.filter((r) => r.isActive);
            mockReturnedRates = rates;
            return Promise.resolve(rates);
          },
        }),
      }),
    }),
  }),
  taxRates: {},
}));

vi.mock('@trademind/config', () => ({
  configManager: {
    get: async (key: string) => {
      if (key in mockConfigValues) return mockConfigValues[key];
      return undefined;
    },
  },
}));

const { calculateFees } = await import('../tax.service');

describe('🧮 Tax & Fee Engine', () => {
  beforeEach(() => {
    mockSegmentFilter = null; // reset per test
  });

  // ── Equity Intraday ────────────────────────
  describe('Equity Intraday', () => {
    beforeEach(() => {
      mockSegmentFilter = 'EQUITY';
    });

    it('should calculate fees for equity intraday BUY', async () => {
      const fees = await calculateFees({
        segment: 'EQUITY',
        transactionType: 'BUY',
        tradeValue: 250000, // 100 shares × ₹2500
        isIntraday: true,
      });

      // Brokerage: min(250000 * 0.0003, 20) = min(75, 20) = 20
      expect(fees.brokerageFee).toBe(20);
      // STT: Buy side has no STT for intraday
      expect(fees.sttTax).toBe(0);
      // Exchange turnover: 250000 * 0.0000297 = 7.425
      expect(fees.exchangeTurnoverFee).toBeCloseTo(7.43, 1);
      // SEBI: (250000 / 10000000) * 1050 = 26.25
      expect(fees.sebiCharges).toBeCloseTo(26.25, 1);
      // Stamp duty (equity intraday buy): 250000 * 0.00003 = 7.5
      expect(fees.stampDuty).toBeCloseTo(7.5, 1);
      // GST: (20 + 7.43 + 26.25) * 0.18 = 9.66
      expect(fees.gstFee).toBeCloseTo(9.66, 1);
    });

    it('should calculate fees for equity intraday SELL', async () => {
      const fees = await calculateFees({
        segment: 'EQUITY',
        transactionType: 'SELL',
        tradeValue: 260000, // 100 shares × ₹2600
        isIntraday: true,
      });

      // Brokerage: min(260000 * 0.0003, 20) = 20
      expect(fees.brokerageFee).toBe(20);
      // STT (sell intraday): 260000 * 0.00025 = 65
      expect(fees.sttTax).toBe(65);
      // Exchange turnover: 260000 * 0.0000297 = 7.722
      expect(fees.exchangeTurnoverFee).toBeCloseTo(7.72, 1);
    });
  });

  // ── Equity Delivery ────────────────────────
  describe('Equity Delivery', () => {
    beforeEach(() => {
      mockSegmentFilter = 'EQUITY';
    });

    it('should calculate fees for equity delivery BUY', async () => {
      const fees = await calculateFees({
        segment: 'EQUITY',
        transactionType: 'BUY',
        tradeValue: 500000,
        isIntraday: false,
      });

      // STT (delivery buy): 500000 * 0.001 = 500
      expect(fees.sttTax).toBe(500);
      // Stamp duty (delivery buy): 500000 * 0.00015 = 75
      expect(fees.stampDuty).toBe(75);
    });

    it('should calculate fees for equity delivery SELL', async () => {
      const fees = await calculateFees({
        segment: 'EQUITY',
        transactionType: 'SELL',
        tradeValue: 520000,
        isIntraday: false,
      });

      // STT (delivery sell): 520000 * 0.001 = 520
      expect(fees.sttTax).toBe(520);
      // No stamp duty on sell
      expect(fees.stampDuty).toBe(0);
    });
  });

  // ── F&O Futures ────────────────────────────
  describe('F&O Futures', () => {
    beforeEach(() => {
      mockSegmentFilter = 'FNO';
    });

    it('should calculate fees for futures SELL', async () => {
      const fees = await calculateFees({
        segment: 'FNO',
        transactionType: 'SELL',
        tradeValue: 2500000, // 50 shares × ₹50000
      });

      // STT (futures sell): 2500000 * 0.0002 = 500
      expect(fees.sttTax).toBe(500);
      // Exchange turnover (futures): 2500000 * 0.0000197 = 49.25
      expect(fees.exchangeTurnoverFee).toBeCloseTo(49.25, 1);
    });
  });

  // ── F&O Options ────────────────────────────
  describe('F&O Options', () => {
    beforeEach(() => {
      mockSegmentFilter = 'FNO';
    });

    it('should calculate fees for options SELL (premium based STT)', async () => {
      const fees = await calculateFees({
        segment: 'FNO',
        transactionType: 'SELL',
        tradeValue: 5000000, // Notional
        premiumValue: 150000, // Premium = 75 * 2000
      });

      // STT on options premium (sell): 150000 * 0.001 = 150
      expect(fees.sttTax).toBe(150);
      // Exchange turnover on options: 150000 * 0.0003503 = 52.545
      expect(fees.exchangeTurnoverFee).toBeCloseTo(52.55, 1);
    });

    it('should calculate fees for options exercise (additional STT)', async () => {
      const fees = await calculateFees({
        segment: 'FNO',
        transactionType: 'BUY',
        tradeValue: 5000000,
        premiumValue: 150000,
        isExercised: true,
      });

      // Exercise STT: 5000000 * 0.00125 = 6250 (in addition to premium STT)
      expect(fees.sttTax).toBeGreaterThan(0);
    });
  });

  // ── Edge cases ─────────────────────────────
  describe('Edge cases', () => {
    beforeEach(() => {
      mockSegmentFilter = 'EQUITY';
    });

    it('should handle very small trade values', async () => {
      const fees = await calculateFees({
        segment: 'EQUITY',
        transactionType: 'BUY',
        tradeValue: 100, // ₹100 trade
        isIntraday: true,
      });

      // All fees should be minimal but non-negative
      expect(fees.brokerageFee).toBeGreaterThanOrEqual(0);
      expect(fees.totalCharges).toBeGreaterThan(0);
      expect(fees.totalCharges).toBeLessThan(100); // Fees shouldn't exceed trade value
    });

    it('should handle zero trade value', async () => {
      const fees = await calculateFees({
        segment: 'EQUITY',
        transactionType: 'BUY',
        tradeValue: 0,
        isIntraday: true,
      });

      expect(fees.brokerageFee).toBe(0);
      expect(fees.sttTax).toBe(0);
      expect(fees.sebiCharges).toBe(0);
      // Stamp duty on zero value is zero
      expect(fees.stampDuty).toBe(0);
    });

    it('should calculate totalCharges as sum of all components', async () => {
      const fees = await calculateFees({
        segment: 'EQUITY',
        transactionType: 'SELL',
        tradeValue: 100000,
        isIntraday: true,
      });

      const expectedTotal = fees.brokerageFee + fees.sttTax + fees.exchangeTurnoverFee
        + fees.gstFee + fees.sebiCharges + fees.stampDuty;
      expect(fees.totalCharges).toBeCloseTo(expectedTotal, 1);
    });
  });
});
