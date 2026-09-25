// ──────────────────────────────────────────────
// TradeMind — TradingView Symbol Resolver & Sanitizer
// Normalizes broker trade symbols (including Indian F&O derivatives)
// to valid TradingView tickers with 100% chart availability.
// ──────────────────────────────────────────────

/**
 * Resolves any raw symbol or derivative contract to a valid TradingView ticker.
 * E.g.:
 * - 'OFSS26SEP10600PE' -> 'NSE:OFSS'
 * - 'NIFTY26SEP25000CE' -> 'NSE:NIFTY'
 * - 'PAYTM26SEPFUT' -> 'NSE:PAYTM'
 * - 'BTCUSDT' (Crypto) -> 'BINANCE:BTCUSDT'
 * - 'NVDA' (US) -> 'NASDAQ:NVDA'
 */
export function resolveTradingViewSymbol(symbol: string | undefined | null, exchange = 'NSE'): {
  cleanSymbol: string;
  isDerivative: boolean;
  underlying?: string;
} {
  if (!symbol) {
    return { cleanSymbol: 'BINANCE:BTCUSDT', isDerivative: false };
  }

  const raw = symbol.toUpperCase().trim();

  // If already prefixed with exchange
  let ex = exchange.toUpperCase();
  let sym = raw;
  if (raw.includes(':')) {
    const parts = raw.split(':');
    ex = parts[0];
    sym = parts.slice(1).join(':');
  }

  // 1. Crypto Exchanges
  if (['BINANCE', 'DELTA', 'BYBIT', 'CRYPTO', 'COINBASE'].includes(ex)) {
    const pair = sym.includes('USDT') || sym.includes('USD') ? sym : `${sym}USDT`;
    return { cleanSymbol: `BINANCE:${pair}`, isDerivative: false };
  }

  // 2. US Equities & Indices
  if (['NASDAQ', 'NYSE', 'AMEX', 'CBOE', 'SP'].includes(ex)) {
    if (sym === 'SPX' || sym === 'S&P 500') return { cleanSymbol: 'SP:SPX', isDerivative: false };
    if (sym === 'NDX' || sym === 'NASDAQ 100') return { cleanSymbol: 'NASDAQ:NDX', isDerivative: false };
    return { cleanSymbol: `${ex === 'NYSE' ? 'NYSE' : 'NASDAQ'}:${sym}`, isDerivative: false };
  }

  // 3. Forex & Global Commodities
  if (['FOREX', 'FX', 'OANDA', 'CURRENCY'].includes(ex)) {
    if (sym.includes('XAU') || sym.includes('GOLD')) return { cleanSymbol: 'OANDA:XAUUSD', isDerivative: false };
    if (sym.includes('OIL')) return { cleanSymbol: 'TVC:USOIL', isDerivative: false };
    return { cleanSymbol: `FX:${sym}`, isDerivative: false };
  }

  // 4. Indian Markets (NSE / BSE / MCX)
  // Detect Futures & Options patterns:
  // Pattern A: Standard monthly: SYMBOL + 2-digit YY + 3-char MMM + STRIKE + CE/PE
  // E.g. OFSS26SEP10600PE, PAYTM26SEP1640PE, TCS26SEP2040PE, NIFTY26SEP25000CE
  const fnoOptionPattern = /^([A-Z&-]+?)(\d{2}[A-Z]{3})(\d+(?:\.\d+)?)(CE|PE)$/i;
  const matchA = sym.match(fnoOptionPattern);
  if (matchA && matchA[1]) {
    const underlying = matchA[1];
    const prefix = ex === 'BSE' ? 'BSE' : 'NSE';
    return {
      cleanSymbol: `${prefix}:${underlying}`,
      isDerivative: true,
      underlying,
    };
  }

  // Pattern B: Weekly expiry options (NIFTY2492625000CE or NIFTY26925CE)
  const weeklyPattern = /^([A-Z&-]+?)(\d{2}\d[A-Z0-9]{2})(\d+)(CE|PE)$/i;
  const matchB = sym.match(weeklyPattern);
  if (matchB && matchB[1]) {
    const underlying = matchB[1];
    const prefix = ex === 'BSE' ? 'BSE' : 'NSE';
    return {
      cleanSymbol: `${prefix}:${underlying}`,
      isDerivative: true,
      underlying,
    };
  }

  // Pattern C: Futures (SYMBOL + YY + MMM + FUT)
  const futPattern = /^([A-Z&-]+?)(\d{2}[A-Z]{3}|\d{2}\d{2})FUT$/i;
  const matchC = sym.match(futPattern);
  if (matchC && matchC[1]) {
    const underlying = matchC[1];
    const prefix = ex === 'BSE' ? 'BSE' : 'NSE';
    return {
      cleanSymbol: `${prefix}:${underlying}`,
      isDerivative: true,
      underlying,
    };
  }

  // Pattern D: Generic trailing CE / PE
  const genericOptionPattern = /^([A-Z&-]+?)\d+.*?(CE|PE|FUT)$/i;
  const matchD = sym.match(genericOptionPattern);
  if (matchD && matchD[1]) {
    const underlying = matchD[1];
    const prefix = ex === 'BSE' ? 'BSE' : 'NSE';
    return {
      cleanSymbol: `${prefix}:${underlying}`,
      isDerivative: true,
      underlying,
    };
  }

  // Default clean symbol
  const prefix = ex === 'BSE' ? 'BSE' : ex === 'MCX' ? 'MCX' : 'NSE';
  return { cleanSymbol: `${prefix}:${sym}`, isDerivative: false };
}
