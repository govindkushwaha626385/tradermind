// ──────────────────────────────────────────────
// TradeMind — FIFO Trade Clustering Engine
// Transforms raw execution fills into journal trades
// using First-In-First-Out matching with position flip support
// ──────────────────────────────────────────────

import type {
  TradeExecution,
  JournalTrade,
  TradeDirection,
} from '@trademind/shared';

export interface ClusteringResult {
  trades: JournalTrade[];
  unlinkedExecutions: TradeExecution[];
  links: Array<{
    journalTradeId: string;
    executionId: string;
    allocatedQuantity: number;
    allocatedFees: number;
  }>;
}

interface OpenTradeState {
  trade: Partial<JournalTrade>;
  remainingQuantity: number; // Positive = long, Negative = short
  totalBuyQty: number;
  totalBuyValue: number;
  totalSellQty: number;
  totalSellValue: number;
  accumulatedGrossPnl: number;
  accumulatedFees: number;
  lastExecutionTimestamp: Date;
  executions: Array<{
    executionId: string;
    quantity: number;
    fees: number;
  }>;
}

/**
 * Cluster raw trade executions into journal trades using FIFO matching.
 * 
 * Algorithm:
 * 1. Group executions by userId, brokerConnectionId, tradingsymbol
 * 2. Sort chronologically by executionTimestamp
 * 3. Process fills using FIFO matching:
 *    - No open position → open new JournalTrade
 *    - Same direction as open → scale in
 *    - Opposite direction → scale out / close
 *    - Flip (fill qty > open qty) → close existing + open new reverse
 */
export function clusterExecutions(
  executions: TradeExecution[],
): ClusteringResult {
  if (executions.length === 0) {
    return { trades: [], unlinkedExecutions: [], links: [] };
  }

  // Group by symbol
  const grouped = groupBySymbol(executions);
  const result: ClusteringResult = {
    trades: [],
    unlinkedExecutions: [],
    links: [],
  };

  for (const [, group] of grouped) {
    const sorted = group.sort(
      (a, b) => a.executionTimestamp.getTime() - b.executionTimestamp.getTime(),
    );

    let current: OpenTradeState | null = null;

    for (const fill of sorted) {
      const fillDirection = getFillDirection(fill);

      if (current === null) {
        // No open position — start new trade
        current = createNewTrade(fill);
      } else if (isSameDirection(current.remainingQuantity, fillDirection)) {
        // Scale in — same direction
        scaleInTrade(current, fill);
      } else if (isPositionFlip(current.remainingQuantity, fill.quantity, fillDirection)) {
        // Position flip — close existing and open new reverse
        // Must be checked BEFORE isCompleteClose since fill qty > remaining qty
        const flipQuantity = Math.abs(current.remainingQuantity);
        const remainingFillQty = fill.quantity - flipQuantity;

        // Create a virtual fill for the close portion
        const closeFill = { ...fill, quantity: flipQuantity };
        closeTrade(current, closeFill);

        // Create a virtual fill for the new position
        const newFill = { ...fill, quantity: remainingFillQty };

        // Finalize the closed trade
        finalizeTrade(current, result);

        // Open new reverse trade
        current = createNewTrade(newFill);
      } else if (isCompleteClose(current.remainingQuantity, fill.quantity, fillDirection)) {
        // Full close
        closeTrade(current, fill);
        finalizeTrade(current, result);
        current = null;
      } else if (isPartialClose(current.remainingQuantity, fill.quantity, fillDirection)) {
        // Partial close — reduce position
        partialCloseTrade(current, fill);
      }
    }

    // Finalize any remaining open trade
    if (current !== null) {
      const finalStatus = current.trade.status === 'PARTIALLY_CLOSED' ? 'PARTIALLY_CLOSED' : 'OPEN';
      const trade = buildTradeFromState(current, finalStatus);
      trade.openQuantity = Math.abs(current.remainingQuantity);
      result.trades.push(trade as JournalTrade);

      for (const exec of current.executions) {
        result.links.push({
          journalTradeId: trade.id!,
          executionId: exec.executionId,
          allocatedQuantity: exec.quantity,
          allocatedFees: exec.fees,
        });
      }
    }
  }

  return result;
}

// ── Private Helpers ──────────────────────

function groupBySymbol(executions: TradeExecution[]): Map<string, TradeExecution[]> {
  const map = new Map<string, TradeExecution[]>();
  for (const exec of executions) {
    const key = `${exec.userId}:${exec.brokerConnectionId}:${exec.tradingsymbol}`;
    const group = map.get(key) ?? [];
    group.push(exec);
    map.set(key, group);
  }
  return map;
}

function getFillDirection(fill: TradeExecution): TradeDirection {
  return fill.transactionType === 'BUY' ? 'LONG' : 'SHORT';
}

function isSameDirection(remainingQty: number, direction: TradeDirection): boolean {
  return (remainingQty > 0 && direction === 'LONG') ||
         (remainingQty < 0 && direction === 'SHORT');
}

function isCompleteClose(
  remainingQty: number,
  fillQty: number,
  direction: TradeDirection,
): boolean {
  return Math.abs(remainingQty) <= fillQty;
}

function isPartialClose(
  remainingQty: number,
  fillQty: number,
  direction: TradeDirection,
): boolean {
  return Math.abs(remainingQty) > fillQty;
}

function isPositionFlip(
  remainingQty: number,
  fillQty: number,
  direction: TradeDirection,
): boolean {
  return Math.abs(remainingQty) < fillQty;
}

function createNewTrade(fill: TradeExecution): OpenTradeState {
  const direction = getFillDirection(fill);
  const qty = direction === 'LONG' ? fill.quantity : -fill.quantity;

  const state: OpenTradeState = {
    trade: {
      userId: fill.userId,
      brokerConnectionId: fill.brokerConnectionId,
      tradingsymbol: fill.tradingsymbol,
      exchange: fill.exchange as any,
      assetClass: mapSegmentToAssetClass(fill.segment) as JournalTrade['assetClass'],
      direction,
      status: 'OPEN',
      totalQuantity: fill.quantity,
      openQuantity: fill.quantity,
      avgEntryPrice: fill.executionPrice,
      openedAt: fill.executionTimestamp,
      grossPnl: 0,
      totalFeesAndTaxes: 0,
      netPnl: 0,
    },
    remainingQuantity: qty,
    totalBuyQty: direction === 'LONG' ? fill.quantity : 0,
    totalBuyValue: direction === 'LONG' ? fill.quantity * fill.executionPrice : 0,
    totalSellQty: direction === 'SHORT' ? fill.quantity : 0,
    totalSellValue: direction === 'SHORT' ? fill.quantity * fill.executionPrice : 0,
    accumulatedGrossPnl: 0,
    accumulatedFees: fill.totalCharges,
    lastExecutionTimestamp: fill.executionTimestamp,
    executions: [{ executionId: fill.id, quantity: fill.quantity, fees: fill.totalCharges }],
  };

  return state;
}

function scaleInTrade(state: OpenTradeState, fill: TradeExecution): void {
  const direction = getFillDirection(fill);
  const qty = direction === 'LONG' ? fill.quantity : -fill.quantity;

  state.remainingQuantity += qty;
  state.trade.totalQuantity! += fill.quantity;
  state.trade.openQuantity = Math.abs(state.remainingQuantity);

  if (direction === 'LONG') {
    state.totalBuyQty += fill.quantity;
    state.totalBuyValue += fill.quantity * fill.executionPrice;
  } else {
    state.totalSellQty += fill.quantity;
    state.totalSellValue += fill.quantity * fill.executionPrice;
  }

  // Recalculate weighted average entry price
  const totalLongValue = state.totalBuyValue;
  const totalShortValue = state.totalSellValue;
  const netQty = state.totalBuyQty - state.totalSellQty;

  if (state.remainingQuantity > 0) {
    state.trade.avgEntryPrice = netQty > 0 ? totalLongValue / state.totalBuyQty : 0;
  } else {
    state.trade.avgEntryPrice = netQty < 0 ? totalShortValue / state.totalSellQty : 0;
  }

  state.accumulatedFees += fill.totalCharges;
  state.lastExecutionTimestamp = fill.executionTimestamp;
  state.executions.push({ executionId: fill.id, quantity: fill.quantity, fees: fill.totalCharges });
}

function closeTrade(state: OpenTradeState, fill: TradeExecution): void {
  const isLong = state.remainingQuantity > 0;
  const closeQty = Math.min(Math.abs(state.remainingQuantity), fill.quantity);

  // Calculate realized P&L for the closed portion
  const closePrice = fill.executionPrice;
  let realizedPnl = 0;

  if (isLong) {
    // Closing long: sell price - avg buy price
    realizedPnl = (closePrice - state.trade.avgEntryPrice!) * closeQty;
    state.totalSellQty += closeQty;
    state.totalSellValue += closeQty * closePrice;
  } else {
    // Closing short: avg sell price - buy price
    realizedPnl = (state.trade.avgEntryPrice! - closePrice) * closeQty;
    state.totalBuyQty += closeQty;
    state.totalBuyValue += closeQty * closePrice;
  }

  state.accumulatedGrossPnl += realizedPnl;
  state.accumulatedFees += fill.totalCharges;
  state.lastExecutionTimestamp = fill.executionTimestamp;
  state.remainingQuantity = isLong
    ? state.remainingQuantity - closeQty
    : state.remainingQuantity + closeQty;

  state.executions.push({
    executionId: fill.id,
    quantity: closeQty,
    fees: fill.totalCharges,
  });
}

function partialCloseTrade(state: OpenTradeState, fill: TradeExecution): void {
  closeTrade(state, fill);
  state.trade.openQuantity = Math.abs(state.remainingQuantity);
  state.trade.status = 'PARTIALLY_CLOSED';
}

function finalizeTrade(state: OpenTradeState, result: ClusteringResult): void {
  const trade = buildTradeFromState(state, 'CLOSED');
  result.trades.push(trade as JournalTrade);

  for (const exec of state.executions) {
    result.links.push({
      journalTradeId: trade.id!,
      executionId: exec.executionId,
      allocatedQuantity: exec.quantity,
      allocatedFees: exec.fees,
    });
  }
}

function buildTradeFromState(state: OpenTradeState, status: 'OPEN' | 'CLOSED' | 'PARTIALLY_CLOSED'): Partial<JournalTrade> {
  const grossPnl = state.accumulatedGrossPnl;
  const totalFees = state.accumulatedFees;

  const isClosed = status === 'CLOSED' || status === 'PARTIALLY_CLOSED';
  const closedAt = isClosed ? (state.lastExecutionTimestamp ?? new Date()) : undefined;

  let holdingPeriodMinutes: number | undefined = undefined;
  if (isClosed && state.trade.openedAt && closedAt) {
    const startMs = new Date(state.trade.openedAt).getTime();
    const endMs = new Date(closedAt).getTime();
    holdingPeriodMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  }

  const trade: Partial<JournalTrade> = {
    ...state.trade,
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    status,
    grossPnl: Math.round(grossPnl * 100) / 100,
    totalFeesAndTaxes: Math.round(totalFees * 100) / 100,
    netPnl: status === 'OPEN' && grossPnl === 0
      ? -Math.round(totalFees * 100) / 100
      : Math.round((grossPnl - totalFees) * 100) / 100,
    openQuantity: status === 'OPEN' || status === 'PARTIALLY_CLOSED' ? Math.abs(state.remainingQuantity) : 0,
    closedAt,
    holdingPeriodMinutes,
  };

  if (isClosed) {
    // Calculate avg exit price
    const isLong = state.trade.direction === 'LONG';
    if (isLong && state.totalSellQty > 0) {
      trade.avgExitPrice = Math.round((state.totalSellValue / state.totalSellQty) * 100) / 100;
    } else if (!isLong && state.totalBuyQty > 0) {
      trade.avgExitPrice = Math.round((state.totalBuyValue / state.totalBuyQty) * 100) / 100;
    }
  }

  return trade;
}

function mapSegmentToAssetClass(segment: string): string {
  switch (segment) {
    case 'EQUITY':
      return 'EQUITY';
    case 'FNO':
      // Will be refined based on instrument details
      return 'FNO_FUTURES';
    case 'CRYPTO_DERIVATIVES':
      return 'CRYPTO_PERP';
    case 'CURRENCY':
      return 'FNO_FUTURES';
    default:
      return 'EQUITY';
  }
}
