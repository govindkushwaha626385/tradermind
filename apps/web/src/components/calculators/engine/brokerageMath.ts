// ──────────────────────────────────────────────
// TradeMind — Brokerage & Regulatory Charges Engine
// Accurate NSE/BSE Indian Market Schedule + Global Mode
// ──────────────────────────────────────────────

export type MarketSegment = 'EQUITY_INTRADAY' | 'EQUITY_DELIVERY' | 'FUTURES' | 'OPTIONS';

export interface BrokerageInputs {
  segment: MarketSegment;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  flatBrokeragePerOrder?: number; // e.g. ₹20 flat or $1.00 flat
  percentBrokerage?: number;     // e.g. 0.03% for intraday
  isGlobalMode?: boolean;        // true for US/Global flat fee mode
}

export interface BrokerageBreakdown {
  turnover: number;
  buyTurnover: number;
  sellTurnover: number;
  grossPnl: number;
  brokerage: number;
  sttCtt: number;
  exchangeCharges: number;
  gst: number;
  sebiCharges: number;
  stampDuty: number;
  totalCharges: number;
  netPnl: number;
  pointsToBreakeven: number;
  roiPercent: number;
}

export function calculateBrokerage(inputs: BrokerageInputs): BrokerageBreakdown {
  const {
    segment,
    buyPrice,
    sellPrice,
    quantity,
    flatBrokeragePerOrder = 20,
    percentBrokerage = 0.03,
    isGlobalMode = false,
  } = inputs;

  const qty = Math.max(1, quantity);
  const buyTurnover = buyPrice * qty;
  const sellTurnover = sellPrice * qty;
  const turnover = buyTurnover + sellTurnover;
  const grossPnl = (sellPrice - buyPrice) * qty;

  if (isGlobalMode) {
    // Standard Global flat commission model (e.g. $1 per order or zero-commission)
    const brokerage = flatBrokeragePerOrder * 2; // Buy order + Sell order
    const totalCharges = brokerage;
    const netPnl = grossPnl - totalCharges;
    const pointsToBreakeven = qty > 0 ? totalCharges / qty : 0;
    const capitalInvested = buyTurnover > 0 ? buyTurnover : 1;
    const roiPercent = (netPnl / capitalInvested) * 100;

    return {
      turnover,
      buyTurnover,
      sellTurnover,
      grossPnl,
      brokerage,
      sttCtt: 0,
      exchangeCharges: 0,
      gst: 0,
      sebiCharges: 0,
      stampDuty: 0,
      totalCharges,
      netPnl,
      pointsToBreakeven,
      roiPercent,
    };
  }

  // ── Indian Market Regulatory Schedule ──────────────────────
  let buyBrokerage = 0;
  let sellBrokerage = 0;

  if (segment === 'EQUITY_DELIVERY') {
    // Discount brokers typically charge ₹0 on equity delivery, or flat ₹20
    buyBrokerage = 0;
    sellBrokerage = 0;
  } else {
    // Intraday, Futures, Options: min(flatBrokerage, percentBrokerage% of turnover)
    buyBrokerage = Math.min(flatBrokeragePerOrder, (buyTurnover * percentBrokerage) / 100);
    sellBrokerage = Math.min(flatBrokeragePerOrder, (sellTurnover * percentBrokerage) / 100);
  }
  const brokerage = Number((buyBrokerage + sellBrokerage).toFixed(2));

  // ── STT / CTT ──────────────────────────────────────────────
  let sttCtt = 0;
  if (segment === 'EQUITY_DELIVERY') {
    // 0.1% on buy and sell
    sttCtt = Math.round((turnover * 0.1) / 100);
  } else if (segment === 'EQUITY_INTRADAY') {
    // 0.025% on sell turnover only
    sttCtt = Math.round((sellTurnover * 0.025) / 100);
  } else if (segment === 'FUTURES') {
    // 0.02% on sell turnover
    sttCtt = Math.round((sellTurnover * 0.02) / 100);
  } else if (segment === 'OPTIONS') {
    // 0.1% on sell premium turnover
    sttCtt = Math.round((sellTurnover * 0.1) / 100);
  }

  // ── Exchange Transaction Charges (NSE base) ────────────────
  let exchangeRate = 0;
  if (segment === 'EQUITY_DELIVERY' || segment === 'EQUITY_INTRADAY') {
    exchangeRate = 0.00297 / 100;
  } else if (segment === 'FUTURES') {
    exchangeRate = 0.00173 / 100;
  } else if (segment === 'OPTIONS') {
    exchangeRate = 0.03503 / 100;
  }
  const exchangeCharges = Number((turnover * exchangeRate).toFixed(2));

  // ── SEBI Turnover Fees (₹10 / crore = 0.0001%) ─────────────
  const sebiCharges = Number(((turnover * 10) / 10_000_000).toFixed(2));

  // ── GST (18% on Brokerage + Exchange Charges + SEBI) ────────
  const gst = Number(((brokerage + exchangeCharges + sebiCharges) * 0.18).toFixed(2));

  // ── Stamp Duty (Buy side only) ──────────────────────────────
  let stampDutyRate = 0;
  if (segment === 'EQUITY_DELIVERY') {
    stampDutyRate = 0.015 / 100;
  } else if (segment === 'EQUITY_INTRADAY') {
    stampDutyRate = 0.003 / 100;
  } else if (segment === 'FUTURES') {
    stampDutyRate = 0.002 / 100;
  } else if (segment === 'OPTIONS') {
    stampDutyRate = 0.003 / 100;
  }
  const stampDuty = Math.round(buyTurnover * stampDutyRate);

  const totalCharges = Number((brokerage + sttCtt + exchangeCharges + gst + sebiCharges + stampDuty).toFixed(2));
  const netPnl = Number((grossPnl - totalCharges).toFixed(2));
  const pointsToBreakeven = qty > 0 ? Number((totalCharges / qty).toFixed(2)) : 0;
  const capitalInvested = buyTurnover > 0 ? buyTurnover : 1;
  const roiPercent = Number(((netPnl / capitalInvested) * 100).toFixed(2));

  return {
    turnover,
    buyTurnover,
    sellTurnover,
    grossPnl,
    brokerage,
    sttCtt,
    exchangeCharges,
    gst,
    sebiCharges,
    stampDuty,
    totalCharges,
    netPnl,
    pointsToBreakeven,
    roiPercent,
  };
}
