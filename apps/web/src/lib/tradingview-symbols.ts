// ──────────────────────────────────────────────
// TradeMind — TradingView Symbol Resolver & Sanitizer
// Normalizes broker trade symbols (including Indian F&O derivatives)
// to valid TradingView tickers with 100% chart availability.
// ──────────────────────────────────────────────

export interface ResolvedSymbol {
  cleanSymbol: string;
  isDerivative: boolean;
  underlying?: string;
  bseAlternative?: string;
  suggestCanvasFallback?: boolean;
}

/**
 * Well-known Indian equities where TradingView's free embed widget restricts
 * direct NSE feed or where the ticker differs on TradingView.
 * BSE tickers are provided as alternatives since BSE feeds often have fewer
 * third-party embedding blocks.
 */
const KNOWN_TRADINGVIEW_MAP: Record<string, { preferred: string; bseAlternative?: string }> = {
  POLICYBZR: { preferred: 'BSE:POLICYBZR', bseAlternative: 'BSE:POLICYBZR' },
  PBFINTECH: { preferred: 'BSE:POLICYBZR', bseAlternative: 'BSE:POLICYBZR' },
  PAYTM: { preferred: 'BSE:PAYTM', bseAlternative: 'BSE:PAYTM' },
  ONEM97: { preferred: 'BSE:PAYTM', bseAlternative: 'BSE:PAYTM' },
  ZOMATO: { preferred: 'BSE:ZOMATO', bseAlternative: 'BSE:ZOMATO' },
  NYKAA: { preferred: 'BSE:NYKAA', bseAlternative: 'BSE:NYKAA' },
  FSN: { preferred: 'BSE:NYKAA', bseAlternative: 'BSE:NYKAA' },
  DELHIVERY: { preferred: 'BSE:DELHIVERY', bseAlternative: 'BSE:DELHIVERY' },
  AWL: { preferred: 'BSE:AWL', bseAlternative: 'BSE:AWL' },
  JIOFIN: { preferred: 'BSE:JIOFIN', bseAlternative: 'BSE:JIOFIN' },
  TATATECH: { preferred: 'BSE:TATATECH', bseAlternative: 'BSE:TATATECH' },
  IREDA: { preferred: 'BSE:IREDA', bseAlternative: 'BSE:IREDA' },
  IRFC: { preferred: 'BSE:IRFC', bseAlternative: 'BSE:IRFC' },
  RVNL: { preferred: 'BSE:RVNL', bseAlternative: 'BSE:RVNL' },
  CDSL: { preferred: 'BSE:CDSL', bseAlternative: 'BSE:CDSL' },
  ANGELONE: { preferred: 'BSE:ANGELONE', bseAlternative: 'BSE:ANGELONE' },
  SUZLON: { preferred: 'BSE:SUZLON', bseAlternative: 'BSE:SUZLON' },
  TRENT: { preferred: 'BSE:TRENT', bseAlternative: 'BSE:TRENT' },
  HAL: { preferred: 'BSE:HAL', bseAlternative: 'BSE:HAL' },
  BEL: { preferred: 'BSE:BEL', bseAlternative: 'BSE:BEL' },
  MAZDOCK: { preferred: 'BSE:MAZDOCK', bseAlternative: 'BSE:MAZDOCK' },
  YESBANK: { preferred: 'BSE:YESBANK', bseAlternative: 'BSE:YESBANK' },
  IDEA: { preferred: 'BSE:IDEA', bseAlternative: 'BSE:IDEA' },
  'L&TFH': { preferred: 'NSE:LTF', bseAlternative: 'BSE:533519' },
  LTF: { preferred: 'NSE:LTF', bseAlternative: 'BSE:533519' },
  'M&M': { preferred: 'NSE:M_M', bseAlternative: 'BSE:M_M' },
  M_M: { preferred: 'NSE:M_M', bseAlternative: 'BSE:M_M' },
  'BAJAJ-AUTO': { preferred: 'NSE:BAJAJ_AUTO', bseAlternative: 'BSE:BAJAJ_AUTO' },
  BAJAJ_AUTO: { preferred: 'NSE:BAJAJ_AUTO', bseAlternative: 'BSE:BAJAJ_AUTO' },
  TATAMOTORS: { preferred: 'BSE:TATAMOTORS', bseAlternative: 'BSE:TATAMOTORS' },
  RELIANCE: { preferred: 'BSE:RELIANCE', bseAlternative: 'BSE:RELIANCE' },
  TCS: { preferred: 'BSE:TCS', bseAlternative: 'BSE:TCS' },
  INFY: { preferred: 'BSE:INFY', bseAlternative: 'BSE:INFY' },
  HDFCBANK: { preferred: 'BSE:HDFCBANK', bseAlternative: 'BSE:HDFCBANK' },
  ICICIBANK: { preferred: 'BSE:ICICIBANK', bseAlternative: 'BSE:ICICIBANK' },
  SBIN: { preferred: 'BSE:SBIN', bseAlternative: 'BSE:SBIN' },
  BHARTIARTL: { preferred: 'BSE:BHARTIARTL', bseAlternative: 'BSE:BHARTIARTL' },
  KOTAKBANK: { preferred: 'BSE:KOTAKBANK', bseAlternative: 'BSE:KOTAKBANK' },
  ITC: { preferred: 'BSE:ITC', bseAlternative: 'BSE:ITC' },
  LT: { preferred: 'BSE:LT', bseAlternative: 'BSE:LT' },
  AXISBANK: { preferred: 'BSE:AXISBANK', bseAlternative: 'BSE:AXISBANK' },
  ASIANPAINT: { preferred: 'BSE:ASIANPAINT', bseAlternative: 'BSE:ASIANPAINT' },
  MARUTI: { preferred: 'BSE:MARUTI', bseAlternative: 'BSE:MARUTI' },
  SUNPHARMA: { preferred: 'BSE:SUNPHARMA', bseAlternative: 'BSE:SUNPHARMA' },
  TITAN: { preferred: 'BSE:TITAN', bseAlternative: 'BSE:TITAN' },
  BAJFINANCE: { preferred: 'BSE:BAJFINANCE', bseAlternative: 'BSE:BAJFINANCE' },
  BAJAJFINSV: { preferred: 'BSE:BAJAJFINSV', bseAlternative: 'BSE:BAJAJFINSV' },
  WIPRO: { preferred: 'BSE:WIPRO', bseAlternative: 'BSE:WIPRO' },
  HCLTECH: { preferred: 'BSE:HCLTECH', bseAlternative: 'BSE:HCLTECH' },
  ULTRACEMCO: { preferred: 'BSE:ULTRACEMCO', bseAlternative: 'BSE:ULTRACEMCO' },
  NESTLEIND: { preferred: 'BSE:NESTLEIND', bseAlternative: 'BSE:NESTLEIND' },
  ADANIENT: { preferred: 'BSE:ADANIENT', bseAlternative: 'BSE:ADANIENT' },
  ADANIPORTS: { preferred: 'BSE:ADANIPORTS', bseAlternative: 'BSE:ADANIPORTS' },
  COALINDIA: { preferred: 'BSE:COALINDIA', bseAlternative: 'BSE:COALINDIA' },
  NTPC: { preferred: 'BSE:NTPC', bseAlternative: 'BSE:NTPC' },
  POWERGRID: { preferred: 'BSE:POWERGRID', bseAlternative: 'BSE:POWERGRID' },
  ONGC: { preferred: 'BSE:ONGC', bseAlternative: 'BSE:ONGC' },
  JSWSTEEL: { preferred: 'BSE:JSWSTEEL', bseAlternative: 'BSE:JSWSTEEL' },
  TATASTEEL: { preferred: 'BSE:TATASTEEL', bseAlternative: 'BSE:TATASTEEL' },
  GRASIM: { preferred: 'BSE:GRASIM', bseAlternative: 'BSE:GRASIM' },
  TECHM: { preferred: 'BSE:TECHM', bseAlternative: 'BSE:TECHM' },
  HINDALCO: { preferred: 'BSE:HINDALCO', bseAlternative: 'BSE:HINDALCO' },
  CIPLA: { preferred: 'BSE:CIPLA', bseAlternative: 'BSE:CIPLA' },
  DRREDDY: { preferred: 'BSE:DRREDDY', bseAlternative: 'BSE:DRREDDY' },
  EICHERMOT: { preferred: 'BSE:EICHERMOT', bseAlternative: 'BSE:EICHERMOT' },
  HEROMOTOCO: { preferred: 'BSE:HEROMOTOCO', bseAlternative: 'BSE:HEROMOTOCO' },
  DIVISLAB: { preferred: 'BSE:DIVISLAB', bseAlternative: 'BSE:DIVISLAB' },
  APOLLOHOSP: { preferred: 'BSE:APOLLOHOSP', bseAlternative: 'BSE:APOLLOHOSP' },
  BPCL: { preferred: 'BSE:BPCL', bseAlternative: 'BSE:BPCL' },
  BRITANNIA: { preferred: 'BSE:BRITANNIA', bseAlternative: 'BSE:BRITANNIA' },
  INDUSINDBK: { preferred: 'BSE:INDUSINDBK', bseAlternative: 'BSE:INDUSINDBK' },
  SHRIRAMFIN: { preferred: 'BSE:SHRIRAMFIN', bseAlternative: 'BSE:SHRIRAMFIN' },
  LTIM: { preferred: 'BSE:LTIM', bseAlternative: 'BSE:LTIM' },
  SBILIFE: { preferred: 'BSE:SBILIFE', bseAlternative: 'BSE:SBILIFE' },
  HDFCLIFE: { preferred: 'BSE:HDFCLIFE', bseAlternative: 'BSE:HDFCLIFE' },
  TATACONSUM: { preferred: 'BSE:TATACONSUM', bseAlternative: 'BSE:TATACONSUM' },
  DLF: { preferred: 'BSE:DLF', bseAlternative: 'BSE:DLF' },
  VEDL: { preferred: 'BSE:VEDL', bseAlternative: 'BSE:VEDL' },
  TVSMOTOR: { preferred: 'BSE:TVSMOTOR', bseAlternative: 'BSE:TVSMOTOR' },
  POLYCAB: { preferred: 'BSE:POLYCAB', bseAlternative: 'BSE:POLYCAB' },
  MOTHERSON: { preferred: 'BSE:MOTHERSON', bseAlternative: 'BSE:MOTHERSON' },
  INDIGO: { preferred: 'BSE:INDIGO', bseAlternative: 'BSE:INDIGO' },
  DIXON: { preferred: 'BSE:DIXON', bseAlternative: 'BSE:DIXON' },
  NAUKRI: { preferred: 'BSE:NAUKRI', bseAlternative: 'BSE:NAUKRI' },
  PERSISTENT: { preferred: 'BSE:PERSISTENT', bseAlternative: 'BSE:PERSISTENT' },
  COFORGE: { preferred: 'BSE:COFORGE', bseAlternative: 'BSE:COFORGE' },
  NIFTY: { preferred: 'NSE:NIFTY' },
  BANKNIFTY: { preferred: 'NSE:BANKNIFTY' },
  FINNIFTY: { preferred: 'NSE:FINNIFTY' },
  MIDCPNIFTY: { preferred: 'NSE:MIDCPNIFTY' },
  SENSEX: { preferred: 'BSE:SENSEX' },
};

/**
 * Resolves any raw symbol or derivative contract to a valid TradingView ticker.
 * E.g.:
 * - 'POLICYBZR26SEP1080PE' -> 'BSE:POLICYBZR' (Avoids TV free-embed block)
 * - 'NIFTY26SEP25000CE' -> 'NSE:NIFTY'
 * - 'BTCUSDT' (Crypto) -> 'BINANCE:BTCUSDT'
 * - 'NVDA' (US) -> 'NASDAQ:NVDA'
 */
export function resolveTradingViewSymbol(symbol: string | undefined | null, exchange = 'NSE'): ResolvedSymbol {
  if (!symbol) {
    return { cleanSymbol: 'BINANCE:BTCUSDT', isDerivative: false };
  }

  const raw = symbol.toUpperCase().trim();

  // If already prefixed with exchange
  let ex = exchange.toUpperCase();
  let sym = raw;
  if (raw.includes(':')) {
    const parts = raw.split(':');
    ex = parts[0] || 'NSE';
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
  // Check if underlying is a derivative pattern:
  let underlying: string | undefined;

  // Pattern A: Standard monthly: SYMBOL + 2-digit YY + 3-char MMM + STRIKE + CE/PE
  // E.g. POLICYBZR26SEP1080PE, PAYTM26SEP1640PE, TCS26SEP2040PE, NIFTY26SEP25000CE
  const fnoOptionPattern = /^([A-Z&-]+?)(\d{2}[A-Z]{3})(\d+(?:\.\d+)?)(CE|PE)$/i;
  const matchA = sym.match(fnoOptionPattern);
  if (matchA && matchA[1]) {
    underlying = matchA[1].toUpperCase();
  }

  // Pattern B: Weekly expiry options (NIFTY2492625000CE or NIFTY26925CE)
  if (!underlying) {
    const weeklyPattern = /^([A-Z&-]+?)(\d{2}\d[A-Z0-9]{2})(\d+)(CE|PE)$/i;
    const matchB = sym.match(weeklyPattern);
    if (matchB && matchB[1]) {
      underlying = matchB[1].toUpperCase();
    }
  }

  // Pattern C: Futures (SYMBOL + YY + MMM + FUT)
  if (!underlying) {
    const futPattern = /^([A-Z&-]+?)(\d{2}[A-Z]{3}|\d{2}\d{2})FUT$/i;
    const matchC = sym.match(futPattern);
    if (matchC && matchC[1]) {
      underlying = matchC[1].toUpperCase();
    }
  }

  // Pattern D: Generic trailing CE / PE
  if (!underlying) {
    const genericOptionPattern = /^([A-Z&-]+?)\d+.*?(CE|PE|FUT)$/i;
    const matchD = sym.match(genericOptionPattern);
    if (matchD && matchD[1]) {
      underlying = matchD[1].toUpperCase();
    }
  }

  const isDerivative = Boolean(underlying);
  const targetTicker = (underlying || sym).toUpperCase();

  // Check known alias map (e.g. POLICYBZR -> BSE:POLICYBZR)
  if (KNOWN_TRADINGVIEW_MAP[targetTicker]) {
    const mapped = KNOWN_TRADINGVIEW_MAP[targetTicker]!;
    return {
      cleanSymbol: mapped.preferred,
      isDerivative,
      underlying: targetTicker,
      bseAlternative: mapped.bseAlternative,
      suggestCanvasFallback: !['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'].includes(targetTicker),
    };
  }

  // Default Indian ticker with TradingView character sanitization (&, - -> _)
  const prefix = ex === 'BSE' ? 'BSE' : ex === 'MCX' ? 'MCX' : 'NSE';
  const isMajorIndex = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'].includes(targetTicker);
  const sanitized = targetTicker.replace(/&/g, '_').replace(/-/g, '_');

  return {
    cleanSymbol: `${prefix}:${sanitized}`,
    isDerivative,
    underlying: isDerivative ? targetTicker : undefined,
    bseAlternative: prefix === 'NSE' ? `BSE:${sanitized}` : undefined,
    suggestCanvasFallback: !isMajorIndex,
  };
}
