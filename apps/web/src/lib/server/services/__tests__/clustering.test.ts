// ──────────────────────────────────────────────
// TradeMind — FIFO Clustering Engine Tests
//
// Tests the core trade matching algorithm:
// - Single buy → sell (simple close)
// - Scale in (multiple buys) → scale out (partial sells)
// - Multiple partial closes
// - Position flip (long → short without full close)
// - Multiple symbols are handled independently
// - Empty input
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { clusterExecutions } from '../clustering.service';
import type { TradeExecution, TradeDirection } from '@trademind/shared';

function makeFill(overrides: Partial<TradeExecution> & { id: string; tradingsymbol: string; transactionType: 'BUY' | 'SELL'; quantity: number; executionPrice: number }): TradeExecution {
  return {
    userId: 'user-1',
    brokerConnectionId: 'conn-1',
    exchange: 'NSE',
    segment: 'EQUITY',
    orderType: 'MARKET',
    brokerExecutionId: `exec-${overrides.id}`,
    brokerOrderId: `order-${overrides.id}`,
    fillHash: `hash-${overrides.id}`,
    brokerageFee: 20,
    sttTax: 0,
    exchangeTurnoverFee: 0,
    gstFee: 0,
    sebiCharges: 0,
    stampDuty: 0,
    totalCharges: 20,
    executionTimestamp: new Date('2026-09-21T09:30:00Z'),
    createdAt: new Date(),
    rawPayload: undefined,
    exchangeOrderId: undefined,
    ...overrides,
  };
}

describe('🔄 FIFO Trade Clustering Engine', () => {
  // ── Empty input ────────────────────────────
  describe('Empty input', () => {
    it('should return empty result for no executions', () => {
      const result = clusterExecutions([]);
      expect(result.trades).toHaveLength(0);
      expect(result.links).toHaveLength(0);
      expect(result.unlinkedExecutions).toHaveLength(0);
    });
  });

  // ── Simple trades ──────────────────────────
  describe('Simple buy → sell (full close)', () => {
    it('should create one CLOSED trade from buy + sell fills', () => {
      const fills: TradeExecution[] = [
        makeFill({ id: '1', tradingsymbol: 'RELIANCE', transactionType: 'BUY', quantity: 100, executionPrice: 2500, executionTimestamp: new Date('2026-09-21T09:30:00Z') }),
        makeFill({ id: '2', tradingsymbol: 'RELIANCE', transactionType: 'SELL', quantity: 100, executionPrice: 2600, executionTimestamp: new Date('2026-09-21T10:00:00Z') }),
      ];

      const result = clusterExecutions(fills);

      expect(result.trades).toHaveLength(1);
      expect(result.links).toHaveLength(2);

      const trade = result.trades[0]!;
      expect(trade.tradingsymbol).toBe('RELIANCE');
      expect(trade.status).toBe('CLOSED');
      expect(trade.direction).toBe('LONG');
      expect(trade.totalQuantity).toBe(100);
      expect(trade.avgEntryPrice).toBe(2500);
      expect(trade.avgExitPrice).toBe(2600);
      expect(trade.netPnl).toBe(10000 - 40); // (100 * 100) - (20 + 20 fees)
    });
  });

  describe('Sell → buy (short trade)', () => {
    it('should create one CLOSED short trade', () => {
      const fills: TradeExecution[] = [
        makeFill({ id: '1', tradingsymbol: 'BANKNIFTY', transactionType: 'SELL', quantity: 50, executionPrice: 50000, executionTimestamp: new Date('2026-09-21T09:30:00Z') }),
        makeFill({ id: '2', tradingsymbol: 'BANKNIFTY', transactionType: 'BUY', quantity: 50, executionPrice: 49500, executionTimestamp: new Date('2026-09-21T10:00:00Z') }),
      ];

      const result = clusterExecutions(fills);

      expect(result.trades).toHaveLength(1);
      const trade = result.trades[0]!;
      expect(trade.direction).toBe('SHORT');
      expect(trade.status).toBe('CLOSED');
      expect(trade.netPnl).toBe(25000 - 40); // (500 * 50) - 40 fees
    });
  });

  // ── Scale in / out ─────────────────────────
  describe('Scale in → scale out', () => {
    it('should handle multiple buys then partial sells', () => {
      const fills: TradeExecution[] = [
        makeFill({ id: '1', tradingsymbol: 'TCS', transactionType: 'BUY', quantity: 100, executionPrice: 4000, executionTimestamp: new Date('2026-09-21T09:30:00Z') }),
        makeFill({ id: '2', tradingsymbol: 'TCS', transactionType: 'BUY', quantity: 50, executionPrice: 4050, executionTimestamp: new Date('2026-09-21T10:00:00Z') }),
        makeFill({ id: '3', tradingsymbol: 'TCS', transactionType: 'SELL', quantity: 75, executionPrice: 4100, executionTimestamp: new Date('2026-09-21T11:00:00Z') }),
      ];

      const result = clusterExecutions(fills);

      // Should have one trade (PARTIALLY_CLOSED) since we didn't close all
      expect(result.trades).toHaveLength(1);
      const trade = result.trades[0]!;
      expect(trade.status).toBe('PARTIALLY_CLOSED');
      expect(trade.totalQuantity).toBe(150);
      expect(trade.avgEntryPrice).toBeCloseTo(4016.67, 0); // (100*4000 + 50*4050) / 150
    });
  });

  describe('Full scale in then complete close', () => {
    it('should produce one CLOSED trade', () => {
      const fills: TradeExecution[] = [
        makeFill({ id: '1', tradingsymbol: 'INFY', transactionType: 'BUY', quantity: 50, executionPrice: 1500, executionTimestamp: new Date('2026-09-21T09:30:00Z') }),
        makeFill({ id: '2', tradingsymbol: 'INFY', transactionType: 'BUY', quantity: 50, executionPrice: 1520, executionTimestamp: new Date('2026-09-21T10:00:00Z') }),
        makeFill({ id: '3', tradingsymbol: 'INFY', transactionType: 'SELL', quantity: 100, executionPrice: 1550, executionTimestamp: new Date('2026-09-21T11:00:00Z') }),
      ];

      const result = clusterExecutions(fills);

      expect(result.trades).toHaveLength(1);
      const trade = result.trades[0]!;
      expect(trade.status).toBe('CLOSED');
      expect(trade.netPnl).toBeGreaterThan(0); // Profitable
    });
  });

  // ── Position flip ──────────────────────────
  describe('Position flip (long → short)', () => {
    it('should close long and open a new short trade', () => {
      const fills: TradeExecution[] = [
        makeFill({ id: '1', tradingsymbol: 'HDFC', transactionType: 'BUY', quantity: 50, executionPrice: 1600, executionTimestamp: new Date('2026-09-21T09:30:00Z') }),
        // Sell 100 when only 50 held → flips to short 50
        makeFill({ id: '2', tradingsymbol: 'HDFC', transactionType: 'SELL', quantity: 100, executionPrice: 1620, executionTimestamp: new Date('2026-09-21T10:00:00Z') }),
      ];

      const result = clusterExecutions(fills);

      // Expect 2 trades: CLOSED long + OPEN short
      expect(result.trades).toHaveLength(2);

      const longTrade = result.trades.find((t) => t.direction === 'LONG')!;
      expect(longTrade.status).toBe('CLOSED');
      expect(longTrade.netPnl).toBe(1000 - 40); // (1620-1600)*50 - fees

      const shortTrade = result.trades.find((t) => t.direction === 'SHORT')!;
      expect(shortTrade.status).toBe('OPEN');
      expect(shortTrade.totalQuantity).toBe(50);
    });
  });

  // ── Multiple symbols ───────────────────────
  describe('Multiple symbols', () => {
    it('should cluster each symbol independently', () => {
      const fills: TradeExecution[] = [
        makeFill({ id: '1', tradingsymbol: 'RELIANCE', transactionType: 'BUY', quantity: 100, executionPrice: 2500, executionTimestamp: new Date('2026-09-21T09:30:00Z') }),
        makeFill({ id: '2', tradingsymbol: 'TCS', transactionType: 'BUY', quantity: 50, executionPrice: 4000, executionTimestamp: new Date('2026-09-21T09:35:00Z') }),
        makeFill({ id: '3', tradingsymbol: 'RELIANCE', transactionType: 'SELL', quantity: 100, executionPrice: 2600, executionTimestamp: new Date('2026-09-21T10:00:00Z') }),
        makeFill({ id: '4', tradingsymbol: 'TCS', transactionType: 'SELL', quantity: 50, executionPrice: 4100, executionTimestamp: new Date('2026-09-21T10:30:00Z') }),
      ];

      const result = clusterExecutions(fills);

      expect(result.trades).toHaveLength(2);
      expect(result.links).toHaveLength(4);

      const relianceTrade = result.trades.find((t) => t.tradingsymbol === 'RELIANCE')!;
      expect(relianceTrade.status).toBe('CLOSED');

      const tcsTrade = result.trades.find((t) => t.tradingsymbol === 'TCS')!;
      expect(tcsTrade.status).toBe('CLOSED');
    });
  });

  // ── Open trade (no exit) ───────────────────
  describe('Open trade (no exit)', () => {
    it('should create an OPEN trade with no exit fills', () => {
      const fills: TradeExecution[] = [
        makeFill({ id: '1', tradingsymbol: 'WIPRO', transactionType: 'BUY', quantity: 200, executionPrice: 500, executionTimestamp: new Date('2026-09-21T09:30:00Z') }),
      ];

      const result = clusterExecutions(fills);

      expect(result.trades).toHaveLength(1);
      const trade = result.trades[0]!;
      expect(trade.status).toBe('OPEN');
      expect(trade.totalQuantity).toBe(200);
      expect(trade.openQuantity).toBe(200);
      // Open trades show negative PnL due to sunk fees (no gross P&L yet)
      expect(trade.netPnl).toBe(-20); // Fees are sunk costs
    });
  });

  // ── Realistic scenario ─────────────────────
  describe('Realistic multi-day scenario', () => {
    it('should handle multiple partial closes across days', () => {
      const fills: TradeExecution[] = [
        makeFill({ id: '1', tradingsymbol: 'SBIN', transactionType: 'BUY', quantity: 1000, executionPrice: 600, executionTimestamp: new Date('2026-09-21T09:30:00Z') }),
        // Day 2: scale in
        makeFill({ id: '2', tradingsymbol: 'SBIN', transactionType: 'BUY', quantity: 500, executionPrice: 610, executionTimestamp: new Date('2026-09-22T09:30:00Z') }),
        // Day 3: partial close 600 shares
        makeFill({ id: '3', tradingsymbol: 'SBIN', transactionType: 'SELL', quantity: 600, executionPrice: 620, executionTimestamp: new Date('2026-09-23T10:00:00Z') }),
        // Day 4: partial close 400 shares
        makeFill({ id: '4', tradingsymbol: 'SBIN', transactionType: 'SELL', quantity: 400, executionPrice: 590, executionTimestamp: new Date('2026-09-24T11:00:00Z') }),
        // Day 5: close remaining 500 shares
        makeFill({ id: '5', tradingsymbol: 'SBIN', transactionType: 'SELL', quantity: 500, executionPrice: 630, executionTimestamp: new Date('2026-09-25T14:00:00Z') }),
      ];

      const result = clusterExecutions(fills);

      expect(result.trades).toHaveLength(1);
      const trade = result.trades[0]!;
      expect(trade.status).toBe('CLOSED');
      expect(trade.totalQuantity).toBe(1500);

      // Total P&L = (620-600)*600 + (590-600)*400 + (630-603.33)*500
      // Where 603.33 is the weighted avg entry after scaling
      // Expected: 12000 - 4000 + 13335 = 21335 - fees
      // FIFO PnL: (620-600)*600 + (590-600)*400 + (630-610)*500 - fees(5*20)
      // = 12000 - 4000 + 10000 - 100 = 17900
      expect(trade.netPnl).toBe(17900);
    });
  });
});
