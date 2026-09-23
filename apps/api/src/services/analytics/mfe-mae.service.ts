// ──────────────────────────────────────────────
// TradeMind — MFE/MAE Calculation Engine
//
// Maximum Favorable Excursion (MFE):
//   The highest profit point the trade reached while open.
//
// Maximum Adverse Excursion (MAE):
//   The deepest drawdown the trade hit while open.
//
// These require historical price data during the trade's
// holding window, fetched from the broker or a data provider.
// ──────────────────────────────────────────────

import type { JournalTrade, TradeExecution } from '@trademind/shared';
import { getDatabase, journalTrades } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import { configManager } from '@trademind/config';

/**
 * OHLC price data point for a single candle.
 */
export interface PriceCandle {
  timestamp: Date;
  high: number;
  low: number;
  open: number;
  close: number;
}

/**
 * Result of an MFE/MAE calculation for a single trade.
 */
export interface MfeMaeResult {
  /** Maximum Favorable Excursion — highest price point reached. */
  maxFavorableExcursion: number;
  /** Maximum Adverse Excursion — lowest price point reached. */
  maxAdverseExcursion: number;
  /** MFE as a percentage of entry price. */
  mfePercent: number;
  /** MAE as a percentage of entry price. */
  maePercent: number;
  /** Highest price during the hold window. */
  highestPrice: number;
  /** Lowest price during the hold window. */
  lowestPrice: number;
}

/**
 * Fetch historical price candles for a symbol during the trade's holding window.
 *
 * In production, this calls a market data API (e.g. Polygon, Alpha Vantage,
 * Yahoo Finance, or the broker's own historical API).
 *
 * For now, this returns simulated data for development.
 */
async function fetchPriceCandles(
  symbol: string,
  exchange: string,
  from: Date,
  to: Date,
): Promise<PriceCandle[]> {
  // ── Check if MFE/MAE is enabled in config ────────────
  const enabled = await configManager.get<boolean>('analytics.mfe_mae_enabled').catch(() => false);
  if (!enabled) {
    throw new Error('MFE/MAE calculation is not enabled. Enable it in Admin > Config > analytics.mfe_mae_enabled');
  }

  // ── Free Yahoo Finance API (no API key required) ──────
  // Map exchange to Yahoo Finance suffix
  // NSE → .NS, BSE → .BO, others → no suffix
  const exchangeSuffix: Record<string, string> = {
    NSE: '.NS',
    NSE_EQ: '.NS',
    BSE: '.BO',
    BSE_EQ: '.BO',
    NFO: '.NS',
    MCX: '.CM',
    CDS: '.NS',
  };
  const yahooSymbol = `${symbol}${exchangeSuffix[exchange] ?? ''}`;

  // Yahoo Finance v8 chart API (free, no auth)
  const fromUnix = Math.floor(from.getTime() / 1000);
  const toUnix = Math.floor(to.getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${fromUnix}&period2=${toUnix}&interval=1m`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'TradeMind/1.0' },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Market data API returned ${response.status} for ${yahooSymbol}`);
  }

  const data = await response.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            high?: number[];
            low?: number[];
            open?: number[];
            close?: number[];
          }>;
        };
      }>;
    };
  };

  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];

  if (!timestamps?.length || !quote?.high?.length) {
    throw new Error(`No price data available for ${yahooSymbol} in the given date range`);
  }

  const candles: PriceCandle[] = [];
  const highs = quote.high;
  const lows = quote.low;
  const opens = quote.open ?? [];
  const closes = quote.close ?? [];

  if (!highs || !lows) {
    throw new Error(`Incomplete price data for ${yahooSymbol}`);
  }

  for (let i = 0; i < timestamps.length; i++) {
    if (highs[i] != null && lows[i] != null) {
      candles.push({
        timestamp: new Date(timestamps[i]! * 1000),
        high: highs[i]!,
        low: lows[i]!,
        open: opens[i] ?? 0,
        close: closes[i] ?? 0,
      });
    }
  }

  if (candles.length === 0) {
    throw new Error(`No price data available for ${yahooSymbol} in the given date range`);
  }

  return candles;
}

/**
 * Calculate MFE and MAE for a single journal trade.
 *
 * MFE = (highest_price_during_hold - entry_price) * direction_multiplier
 * MAE = (lowest_price_during_hold - entry_price) * direction_multiplier
 *
 * For LONG trades:  MFE = high - entry,  MAE = entry - low
 * For SHORT trades: MFE = entry - low,   MAE = high - entry
 */
export async function calculateMfeMae(
  trade: JournalTrade,
): Promise<MfeMaeResult | null> {
  // We need an open and close time to calculate
  if (!trade.openedAt || !trade.closedAt) return null;
  if (!trade.avgEntryPrice) return null;

  // Fetch price data during the holding window
  const candles = await fetchPriceCandles(
    trade.tradingsymbol,
    trade.exchange,
    new Date(trade.openedAt),
    new Date(trade.closedAt),
  );

  if (candles.length === 0) return null;

  // Find highest and lowest prices during the hold window
  let highestPrice = candles[0]!.high;
  let lowestPrice = candles[0]!.low;

  for (const candle of candles) {
    if (candle.high > highestPrice) highestPrice = candle.high;
    if (candle.low < lowestPrice) lowestPrice = candle.low;
  }

  const entryPrice = trade.avgEntryPrice;
  const isLong = trade.direction === 'LONG';

  // Calculate MFE and MAE based on trade direction
  let maxFavorableExcursion: number;
  let maxAdverseExcursion: number;

  if (isLong) {
    // LONG: MFE = how high price went above entry
    //       MAE = how low price went below entry
    maxFavorableExcursion = highestPrice - entryPrice;
    maxAdverseExcursion = entryPrice - lowestPrice;
  } else {
    // SHORT: MFE = how low price went below entry (good for shorts)
    //        MAE = how high price went above entry (bad for shorts)
    maxFavorableExcursion = entryPrice - lowestPrice;
    maxAdverseExcursion = highestPrice - entryPrice;
  }

  return {
    maxFavorableExcursion: Math.round(maxFavorableExcursion * 100) / 100,
    maxAdverseExcursion: Math.round(maxAdverseExcursion * 100) / 100,
    mfePercent: Math.round((maxFavorableExcursion / entryPrice) * 10000) / 100,
    maePercent: Math.round((maxAdverseExcursion / entryPrice) * 10000) / 100,
    highestPrice: Math.round(highestPrice * 100) / 100,
    lowestPrice: Math.round(lowestPrice * 100) / 100,
  };
}

/**
 * Calculate MFE/MAE for all closed trades and update them in the database.
 */
export async function calculateMfeMaeForAllTrades(userId: string) {
  const db = getDatabase();
  const trades = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        eq(journalTrades.status, 'CLOSED'),
      ),
    );

  let updatedCount = 0;
  for (const trade of trades) {
    const result = await calculateMfeMae(trade as JournalTrade);
    if (result) {
      await db
        .update(journalTrades)
        .set({
          maxFavorableExcursion: result.maxFavorableExcursion,
          maxAdverseExcursion: result.maxAdverseExcursion,
        })
        .where(eq(journalTrades.id, trade.id));
      updatedCount++;
    }
  }

  return { total: trades.length, updated: updatedCount };
}
