// ──────────────────────────────────────────────
// TradeMind — Multi-Broker CSV Import Service
//
// Auto-detects broker format from CSV headers
// and parses rows into normalized JournalTrade inserts.
//
// Supported brokers:
//   - Zerodha (Kite Trade Book)
//   - Upstox (Trade History)
//   - Angel One (Order Book Export)
//   - Fyers (Trade Log)
//   - Groww (Trade History)
// ──────────────────────────────────────────────

export type SupportedCsvBroker = 'zerodha' | 'upstox' | 'angelone' | 'fyers' | 'groww' | 'unknown';

export interface ParsedCsvTrade {
  tradingsymbol: string;
  exchange: string;
  assetClass: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  totalQuantity: number;
  avgEntryPrice: number;
  avgExitPrice?: number;
  openedAt: Date;
  closedAt?: Date;
  grossPnl: number;
  totalFeesAndTaxes: number;
  netPnl: number;
  holdingPeriodMinutes?: number;
  tradeType: 'MANUAL';
}

export interface CsvImportResult {
  broker: SupportedCsvBroker;
  totalRows: number;
  parsedTrades: ParsedCsvTrade[];
  skippedRows: number;
  errors: string[];
}

// ── Utility helpers ────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let inQuote = false;
  let current = '';

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(raw: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = raw.split('\n').map((l) => l.replace(/\r/g, '')).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const firstLine = lines[0] ?? '';
  const headers = parseCsvLine(firstLine).map((h) => h.replace(/"/g, '').trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').replace(/"/g, '').trim();
    });
    return row;
  });
  return { headers, rows };
}

function safeNum(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[₹,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function guessAssetClass(symbol: string, exchange: string): string {
  if (/CE$|PE$/.test(symbol)) return 'OPTIONS';
  if (/FUT$/.test(symbol)) return 'FUTURES';
  if (/CUR/.test(exchange)) return 'CURRENCY';
  if (/MCX/.test(exchange) || /COMM/.test(exchange)) return 'COMMODITY';
  return 'EQUITY';
}

function detectBroker(headers: string[]): SupportedCsvBroker {
  const h = headers.join(' ').toLowerCase();

  if (h.includes('tradingsymbol') && h.includes('trade_type') && h.includes('quantity')) return 'zerodha';
  if (h.includes('instrument_name') && h.includes('buy_amount') && h.includes('sell_amount')) return 'upstox';
  if (h.includes('scripname') && h.includes('buyprice') && h.includes('sellprice')) return 'angelone';
  if (h.includes('symbol') && h.includes('tradedprice') && h.includes('side') && h.includes('exchtime')) return 'fyers';
  if (h.includes('isin') && h.includes('trade price') && h.includes('trade quantity')) return 'groww';

  return 'unknown';
}

// ── Per-broker parsers ────────────────────────────────────────────────

function parseZerodha(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  // Group by symbol to form LONG/SHORT legs
  const grouped: Record<string, Record<string, string>[]> = {};
  for (const row of rows) {
    const sym = row['tradingsymbol'] ?? row['Tradingsymbol'] ?? '';
    if (!sym) continue;
    if (!grouped[sym]) grouped[sym] = [];
    grouped[sym].push(row);
  }

  for (const [sym, symRows] of Object.entries(grouped)) {
    try {
      const buys = symRows.filter((r) => (r['trade_type'] ?? r['Trade Type'] ?? '').toLowerCase().includes('buy'));
      const sells = symRows.filter((r) => (r['trade_type'] ?? r['Trade Type'] ?? '').toLowerCase().includes('sell'));

      const buyQty = buys.reduce((a, r) => a + safeNum(r['quantity'] ?? r['Quantity']), 0);
      const sellQty = sells.reduce((a, r) => a + safeNum(r['quantity'] ?? r['Quantity']), 0);

      const avgBuy = buys.length
        ? buys.reduce((a, r) => a + safeNum(r['price'] ?? r['Price']), 0) / buys.length
        : 0;
      const avgSell = sells.length
        ? sells.reduce((a, r) => a + safeNum(r['price'] ?? r['Price']), 0) / sells.length
        : 0;

      const firstRow = symRows[0];
      if (!firstRow) continue;
      const exchange: string = (firstRow['exchange'] ?? firstRow['Exchange'] ?? 'NSE') as string;
      const openedAt = new Date((firstRow['order_execution_time'] ?? firstRow['Trade Date'] ?? Date.now()) as string | number);
      const lastSell = sells[sells.length - 1];
      const closedAt = sells.length > 0 && lastSell ? new Date(lastSell['order_execution_time'] ?? Date.now()) : undefined;

      const direction: 'LONG' | 'SHORT' = buyQty >= sellQty ? 'LONG' : 'SHORT';
      const qty = Math.max(buyQty, sellQty);
      const grossPnl = direction === 'LONG' ? (avgSell - avgBuy) * qty : (avgBuy - avgSell) * qty;
      const netPnl = grossPnl; // Zerodha CSV doesn't include fees in trade book

      trades.push({
        tradingsymbol: sym.toUpperCase(),
        exchange,
        assetClass: guessAssetClass(sym, exchange),
        direction,
        status: sellQty >= buyQty ? 'CLOSED' : 'OPEN',
        totalQuantity: qty,
        avgEntryPrice: direction === 'LONG' ? avgBuy : avgSell,
        avgExitPrice: direction === 'LONG' ? avgSell : avgBuy,
        openedAt,
        closedAt,
        grossPnl,
        totalFeesAndTaxes: 0,
        netPnl,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Zerodha: Error parsing ${sym}: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseUpstox(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const sym = row['instrument_name'] ?? row['Instrument Name'] ?? '';
      if (!sym) continue;

      const buyAmt = safeNum(row['buy_amount'] ?? row['Buy Amount']);
      const sellAmt = safeNum(row['sell_amount'] ?? row['Sell Amount']);
      const buyQty = safeNum(row['buy_quantity'] ?? row['Buy Quantity']);
      const sellQty = safeNum(row['sell_quantity'] ?? row['Sell Quantity']);

      const direction: 'LONG' | 'SHORT' = buyQty >= sellQty ? 'LONG' : 'SHORT';
      const qty = Math.max(buyQty, sellQty);
      const avgBuy = buyQty > 0 ? buyAmt / buyQty : 0;
      const avgSell = sellQty > 0 ? sellAmt / sellQty : 0;
      const grossPnl = sellAmt - buyAmt;
      const exchange = row['exchange'] ?? row['Exchange'] ?? 'NSE';

      trades.push({
        tradingsymbol: sym.toUpperCase(),
        exchange,
        assetClass: guessAssetClass(sym, exchange),
        direction,
        status: 'CLOSED',
        totalQuantity: qty,
        avgEntryPrice: direction === 'LONG' ? avgBuy : avgSell,
        avgExitPrice: direction === 'LONG' ? avgSell : avgBuy,
        openedAt: new Date(row['trade_date'] ?? row['Trade Date'] ?? Date.now()),
        closedAt: new Date(row['trade_date'] ?? row['Trade Date'] ?? Date.now()),
        grossPnl,
        totalFeesAndTaxes: 0,
        netPnl: grossPnl,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Upstox: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseAngelOne(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  const grouped: Record<string, Record<string, string>[]> = {};
  for (const row of rows) {
    const sym = row['scripname'] ?? row['ScripName'] ?? row['Symbol'] ?? '';
    if (!sym) continue;
    if (!grouped[sym]) grouped[sym] = [];
    grouped[sym].push(row);
  }

  for (const [sym, symRows] of Object.entries(grouped)) {
    try {
      const buys = symRows.filter((r) => (r['transactiontype'] ?? r['TransactionType'] ?? '').toUpperCase() === 'BUY');
      const sells = symRows.filter((r) => (r['transactiontype'] ?? r['TransactionType'] ?? '').toUpperCase() === 'SELL');

      const buyQty = buys.reduce((a, r) => a + safeNum(r['qty'] ?? r['Qty']), 0);
      const sellQty = sells.reduce((a, r) => a + safeNum(r['qty'] ?? r['Qty']), 0);

      const avgBuy = buys.length
        ? buys.reduce((a, r) => a + safeNum(r['buyprice'] ?? r['BuyPrice']), 0) / buys.length
        : 0;
      const avgSell = sells.length
        ? sells.reduce((a, r) => a + safeNum(r['sellprice'] ?? r['SellPrice']), 0) / sells.length
        : 0;

      const firstAngelRow = symRows[0];
      if (!firstAngelRow) continue;
      const direction: 'LONG' | 'SHORT' = buyQty >= sellQty ? 'LONG' : 'SHORT';
      const qty = Math.max(buyQty, sellQty);
      const grossPnl = direction === 'LONG' ? (avgSell - avgBuy) * qty : (avgBuy - avgSell) * qty;
      const exchange = (firstAngelRow['exchange'] ?? firstAngelRow['Exchange'] ?? 'NSE') as string;

      trades.push({
        tradingsymbol: sym.toUpperCase(),
        exchange,
        assetClass: guessAssetClass(sym, exchange),
        direction,
        status: sellQty >= buyQty ? 'CLOSED' : 'OPEN',
        totalQuantity: qty,
        avgEntryPrice: direction === 'LONG' ? avgBuy : avgSell,
        avgExitPrice: direction === 'LONG' ? avgSell : avgBuy,
        openedAt: new Date((firstAngelRow['orderdate'] ?? firstAngelRow['OrderDate'] ?? Date.now()) as string | number),
        grossPnl,
        totalFeesAndTaxes: 0,
        netPnl: grossPnl,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Angel One: Error parsing ${sym}: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseFyers(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const sym = row['symbol'] ?? row['Symbol'] ?? '';
      if (!sym) continue;
      const side = (row['side'] ?? row['Side'] ?? '').toUpperCase();
      const price = safeNum(row['tradedprice'] ?? row['TradedPrice']);
      const qty = safeNum(row['qty'] ?? row['Qty']);
      const tradeTime = new Date(row['exchtime'] ?? row['ExchTime'] ?? Date.now());
      const parts = sym.split(':');
      const exchange = sym.includes(':') ? (parts[0] ?? 'NSE') : 'NSE';
      const cleanSym = sym.includes(':') ? (parts[1] ?? sym) : sym;
      const fees = safeNum(row['brokerageamt'] ?? row['BrokerageAmt']);

      trades.push({
        tradingsymbol: cleanSym.toUpperCase(),
        exchange,
        assetClass: guessAssetClass(cleanSym, exchange),
        direction: side === 'BUY' ? 'LONG' : 'SHORT',
        status: 'CLOSED',
        totalQuantity: qty,
        avgEntryPrice: price,
        openedAt: tradeTime,
        grossPnl: 0, // Fyers individual rows don't have P&L
        totalFeesAndTaxes: fees,
        netPnl: -fees,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Fyers: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseGroww(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const sym = row['script'] ?? row['Symbol'] ?? row['Stock Symbol'] ?? '';
      if (!sym) continue;
      const qty = safeNum(row['trade quantity'] ?? row['Trade Quantity'] ?? row['Qty']);
      const price = safeNum(row['trade price'] ?? row['Trade Price']);
      const side = (row['order type'] ?? row['Order Type'] ?? row['Transaction Type'] ?? '').toUpperCase();
      const tradeDate = new Date(row['trade date'] ?? row['Trade Date'] ?? Date.now());

      trades.push({
        tradingsymbol: sym.toUpperCase().replace(/\s+/g, ''),
        exchange: 'NSE',
        assetClass: 'EQUITY',
        direction: side.includes('BUY') ? 'LONG' : 'SHORT',
        status: 'CLOSED',
        totalQuantity: qty,
        avgEntryPrice: price,
        openedAt: tradeDate,
        grossPnl: 0,
        totalFeesAndTaxes: 0,
        netPnl: 0,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Groww: ${e.message}`);
    }
  }

  return { trades, errors };
}

// ── Main parse entry point ────────────────────────────────────────

export function parseCsvTrades(rawCsv: string): CsvImportResult {
  const { headers, rows } = parseCsv(rawCsv);
  const broker = detectBroker(headers);

  let result: { trades: ParsedCsvTrade[]; errors: string[] };

  switch (broker) {
    case 'zerodha':   result = parseZerodha(rows);   break;
    case 'upstox':    result = parseUpstox(rows);    break;
    case 'angelone':  result = parseAngelOne(rows);  break;
    case 'fyers':     result = parseFyers(rows);     break;
    case 'groww':     result = parseGroww(rows);     break;
    default:
      result = { trades: [], errors: ['Could not detect broker format from CSV headers. Supported: Zerodha, Upstox, Angel One, Fyers, Groww.'] };
  }

  return {
    broker,
    totalRows: rows.length,
    parsedTrades: result.trades,
    skippedRows: rows.length - result.trades.length,
    errors: result.errors,
  };
}
