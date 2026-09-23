// ──────────────────────────────────────────────
// TradeMind — Advanced Analytics Service Tests
//
// Tests Sharpe ratio calculation and streak analysis.
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateStreaks,
  calculateMaxDrawdown,
  calculateRMultipleDistribution,
  calculateHoldingTimeStats,
} from '../analytics/advanced-analytics.service';

describe('📊 Advanced Analytics Utilities', () => {
  // ── Sharpe Ratio ──────────────────────────
  describe('calculateSharpeRatio', () => {
    it('should return 0 for less than 2 data points', () => {
      expect(calculateSharpeRatio([])).toBe(0);
      expect(calculateSharpeRatio([100])).toBe(0);
    });

    it('should return 0 when variance is zero (all returns equal)', () => {
      expect(calculateSharpeRatio([50, 50, 50])).toBe(0);
    });

    it('should calculate positive Sharpe ratio for consistently positive returns', () => {
      const returns = [100, 150, 120, 200, 180, 250, 300];
      const sharpe = calculateSharpeRatio(returns);
      expect(sharpe).toBeGreaterThan(0);
    });

    it('should calculate negative Sharpe ratio for consistently negative returns', () => {
      const returns = [-100, -150, -120, -200, -180];
      const sharpe = calculateSharpeRatio(returns);
      expect(sharpe).toBeLessThan(0);
    });
  });

  // ── Streaks ───────────────────────────────
  describe('calculateStreaks', () => {
    it('should handle empty trade list', () => {
      const result = calculateStreaks([]);
      expect(result).toEqual({
        currentWinStreak: 0,
        currentLossStreak: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
      });
    });

    it('should calculate streaks correctly for all wins', () => {
      const trades = [{ netPnl: 100 }, { netPnl: 50 }, { netPnl: 200 }];
      const result = calculateStreaks(trades);
      expect(result.currentWinStreak).toBe(3);
      expect(result.currentLossStreak).toBe(0);
      expect(result.longestWinStreak).toBe(3);
      expect(result.longestLossStreak).toBe(0);
    });

    it('should calculate streaks correctly for all losses', () => {
      const trades = [{ netPnl: -100 }, { netPnl: -50 }, { netPnl: -200 }];
      const result = calculateStreaks(trades);
      expect(result.currentWinStreak).toBe(0);
      expect(result.currentLossStreak).toBe(3);
      expect(result.longestWinStreak).toBe(0);
      expect(result.longestLossStreak).toBe(3);
    });

    it('should track alternating win/loss streaks', () => {
      const trades = [
        { netPnl: 100 }, // W (1)
        { netPnl: 200 }, // W (2)
        { netPnl: 50 },  // W (3)
        { netPnl: -50 }, // L (1)
        { netPnl: -30 }, // L (2)
        { netPnl: 150 }, // W (1)
        { netPnl: 80 },  // W (2)
      ];
      const result = calculateStreaks(trades);
      expect(result.currentWinStreak).toBe(2);
      expect(result.currentLossStreak).toBe(0);
      expect(result.longestWinStreak).toBe(3);
      expect(result.longestLossStreak).toBe(2);
    });

    it('should treat zero P&L as a loss', () => {
      const trades = [{ netPnl: 100 }, { netPnl: 0 }, { netPnl: 100 }];
      const result = calculateStreaks(trades);
      expect(result.longestWinStreak).toBe(1);
      expect(result.longestLossStreak).toBe(1);
    });
  });

  // ── Sortino Ratio ──────────────────────────
  describe('calculateSortinoRatio', () => {
    it('should return 0 for less than 2 data points', () => {
      expect(calculateSortinoRatio([])).toBe(0);
      expect(calculateSortinoRatio([50])).toBe(0);
    });

    it('should return near-perfect value (99.99) when there is no downside deviation and positive returns', () => {
      const returns = [100, 200, 150, 300];
      expect(calculateSortinoRatio(returns)).toBe(99.99);
    });

    it('should calculate Sortino ratio penalizing only downside volatility', () => {
      const returns = [100, -50, 120, -30, 200, 80];
      const sortino = calculateSortinoRatio(returns);
      expect(sortino).toBeGreaterThan(0);
    });

    it('should calculate negative Sortino ratio for net negative returns with downside', () => {
      const returns = [-100, -200, 50, -80, -120];
      const sortino = calculateSortinoRatio(returns);
      expect(sortino).toBeLessThan(0);
    });
  });

  // ── Max Drawdown ───────────────────────────
  describe('calculateMaxDrawdown', () => {
    it('should return 0 for empty array', () => {
      expect(calculateMaxDrawdown([])).toEqual({
        maxDrawdown: 0,
        maxDrawdownPct: 0,
        peakPnl: 0,
      });
    });

    it('should return 0 drawdown for consistently winning trades', () => {
      const result = calculateMaxDrawdown([100, 200, 300]);
      expect(result.maxDrawdown).toBe(0);
      expect(result.maxDrawdownPct).toBe(0);
      expect(result.peakPnl).toBe(600);
    });

    it('should calculate drawdown from peak correctly', () => {
      // cumPnL: 100 -> 300 (peak) -> 150 (drawdown 150) -> 250 -> 100 (drawdown 200) -> 400 (new peak)
      const pnls = [100, 200, -150, 100, -150, 300];
      const result = calculateMaxDrawdown(pnls);
      expect(result.maxDrawdown).toBe(200);
      expect(result.peakPnl).toBe(400);
    });
  });

  // ── Holding Time Stats ─────────────────────
  describe('calculateHoldingTimeStats', () => {
    it('should return 0s for empty trades or trades without hold time', () => {
      expect(calculateHoldingTimeStats([])).toEqual({
        avgWinHoldMin: 0,
        avgLossHoldMin: 0,
        avgHoldMin: 0,
      });
      expect(
        calculateHoldingTimeStats([
          { holdingPeriodMinutes: null, netPnl: 100 },
          { holdingPeriodMinutes: undefined, netPnl: -50 },
        ]),
      ).toEqual({
        avgWinHoldMin: 0,
        avgLossHoldMin: 0,
        avgHoldMin: 0,
      });
    });

    it('should calculate separate averages for wins and losses', () => {
      const trades = [
        { holdingPeriodMinutes: 30, netPnl: 100 },
        { holdingPeriodMinutes: 50, netPnl: 200 },
        { holdingPeriodMinutes: 10, netPnl: -50 },
        { holdingPeriodMinutes: 20, netPnl: -30 },
      ];
      const result = calculateHoldingTimeStats(trades);
      expect(result.avgWinHoldMin).toBe(40); // (30+50)/2
      expect(result.avgLossHoldMin).toBe(15); // (10+20)/2
      expect(result.avgHoldMin).toBe(28); // (30+50+10+20)/4 = 27.5 -> 28
    });
  });

  // ── R-Multiple Distribution ────────────────
  describe('calculateRMultipleDistribution', () => {
    it('should produce 6 standard buckets with counts and percentages', () => {
      const rValues = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
      const dist = calculateRMultipleDistribution(rValues);
      expect(dist).toHaveLength(6);
      expect(dist.map((d) => d.count)).toEqual([1, 1, 1, 1, 1, 1]);
      dist.forEach((d) => {
        expect(d.pct).toBeCloseTo(16.67, 1);
      });
    });
  });
});
