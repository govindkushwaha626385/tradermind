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

export type SupportedCsvBroker = 'zerodha' | 'upstox' | 'angelone' | 'fyers' | 'groww' | 'dhan' | 'unknown';

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

function parseFlexDate(val: string | number | undefined): Date {
  if (!val) return new Date();
  if (typeof val === 'number') return new Date(val);
  const s = String(val).trim();
  if (!s) return new Date();

  // Test direct ISO
  const direct = new Date(s);
  if (!isNaN(direct.getTime()) && direct.getFullYear() > 1990 && direct.getFullYear() < 2100) return direct;

  // DD-MM-YYYY or DD/MM/YYYY with optional time
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    const day = parseInt(m[1]!, 10);
    const month = parseInt(m[2]!, 10) - 1;
    const year = parseInt(m[3]!, 10);
    const hour = m[4] ? parseInt(m[4], 10) : 0;
    const min = m[5] ? parseInt(m[5], 10) : 0;
    const sec = m[6] ? parseInt(m[6], 10) : 0;
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }

  // YYYY-MM-DD or YYYY/MM/DD with optional time
  const my = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (my) {
    const year = parseInt(my[1]!, 10);
    const month = parseInt(my[2]!, 10) - 1;
    const day = parseInt(my[3]!, 10);
    const hour = my[4] ? parseInt(my[4], 10) : 0;
    const min = my[5] ? parseInt(my[5], 10) : 0;
    const sec = my[6] ? parseInt(my[6], 10) : 0;
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }

  return new Date();
}

function safeNum(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(String(val).replace(/[₹,\s]/g, ''));
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

  if (h.includes('tradingsymbol') && (h.includes('trade_type') || h.includes('trade type')) && h.includes('quantity')) return 'zerodha';
  if (h.includes('instrument_name') && (h.includes('buy_amount') || h.includes('sell_amount') || h.includes('upstox'))) return 'upstox';
  if (h.includes('scripname') && (h.includes('buyprice') || h.includes('transactiontype'))) return 'angelone';
  if (h.includes('symbol') && (h.includes('tradedprice') || (h.includes('side') && h.includes('exchtime')))) return 'fyers';
  if (h.includes('isin') && (h.includes('trade price') || h.includes('trade quantity') || h.includes('groww'))) return 'groww';
  if (h.includes('dhan') || (h.includes('custom_symbol') && h.includes('traded_quantity')) || (h.includes('trading_symbol') && h.includes('transaction_type'))) return 'dhan';

  return 'unknown';
}

// ── Per-broker parsers ────────────────────────────────────────────────
function parseZerodha(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  // Group by symbol + trade date so multiple trading days are distinct
  const grouped: Record<string, Record<string, string>[]> = {};
  for (const row of rows) {
    const sym = row['tradingsymbol'] ?? row['Tradingsymbol'] ?? row['Trading Symbol'] ?? row['Symbol'] ?? '';
    if (!sym) continue;
    const rawTime = row['order_execution_time'] ?? row['Order Execution Time'] ?? row['trade_date'] ?? row['Trade Date'] ?? '';
    const dateKey = String(rawTime).slice(0, 10).trim() || 'all';
    const groupKey = `${sym.toUpperCase()}::${dateKey}`;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(row);
  }

  for (const [key, symRows] of Object.entries(grouped)) {
    const sym = key.split('::')[0] ?? '';
    try {
      const buys = symRows.filter((r) => (r['trade_type'] ?? r['Trade Type'] ?? '').toLowerCase().includes('buy'));
      const sells = symRows.filter((r) => (r['trade_type'] ?? r['Trade Type'] ?? '').toLowerCase().includes('sell'));

      const buyQty = buys.reduce((a, r) => a + safeNum(r['quantity'] ?? r['Quantity']), 0);
      const sellQty = sells.reduce((a, r) => a + safeNum(r['quantity'] ?? r['Quantity']), 0);

      const buyVal = buys.reduce((a, r) => a + safeNum(r['price'] ?? r['Price']) * safeNum(r['quantity'] ?? r['Quantity']), 0);
      const sellVal = sells.reduce((a, r) => a + safeNum(r['price'] ?? r['Price']) * safeNum(r['quantity'] ?? r['Quantity']), 0);

      const avgBuy = buyQty > 0 ? buyVal / buyQty : 0;
      const avgSell = sellQty > 0 ? sellVal / sellQty : 0;

      const firstRow = symRows[0];
      if (!firstRow) continue;
      const exchange: string = (firstRow['exchange'] ?? firstRow['Exchange'] ?? 'NSE') as string;
      const openedAt = parseFlexDate(firstRow['order_execution_time'] ?? firstRow['Order Execution Time'] ?? firstRow['trade_date'] ?? firstRow['Trade Date']);
      const lastSell = sells[sells.length - 1];
      const closedAt = sells.length > 0 && lastSell ? parseFlexDate(lastSell['order_execution_time'] ?? lastSell['Order Execution Time'] ?? lastSell['trade_date'] ?? lastSell['Trade Date']) : undefined;

      const direction: 'LONG' | 'SHORT' = buyQty >= sellQty ? 'LONG' : 'SHORT';
      const qty = Math.max(buyQty, sellQty);
      const grossPnl = direction === 'LONG' ? (avgSell - avgBuy) * qty : (avgBuy - avgSell) * qty;
      const netPnl = grossPnl;

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
      const sym = row['instrument_name'] ?? row['Instrument Name'] ?? row['Scrip Name'] ?? row['tradingsymbol'] ?? '';
      if (!sym) continue;

      const buyAmt = safeNum(row['buy_amount'] ?? row['Buy Amount']);
      const sellAmt = safeNum(row['sell_amount'] ?? row['Sell Amount']);
      const buyQty = safeNum(row['buy_quantity'] ?? row['Buy Quantity'] ?? row['quantity']);
      const sellQty = safeNum(row['sell_quantity'] ?? row['Sell Quantity']);

      const direction: 'LONG' | 'SHORT' = buyQty >= sellQty ? 'LONG' : 'SHORT';
      const qty = Math.max(buyQty, sellQty);
      const avgBuy = buyQty > 0 ? buyAmt / buyQty : 0;
      const avgSell = sellQty > 0 ? sellAmt / sellQty : 0;
      const grossPnl = sellAmt - buyAmt;
      const exchange = row['exchange'] ?? row['Exchange'] ?? 'NSE';
      const tradeDate = parseFlexDate(row['trade_date'] ?? row['Trade Date'] ?? row['date'] ?? row['Date']);

      trades.push({
        tradingsymbol: sym.toUpperCase(),
        exchange,
        assetClass: guessAssetClass(sym, exchange),
        direction,
        status: 'CLOSED',
        totalQuantity: qty,
        avgEntryPrice: direction === 'LONG' ? avgBuy : avgSell,
        avgExitPrice: direction === 'LONG' ? avgSell : avgBuy,
        openedAt: tradeDate,
        closedAt: tradeDate,
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
    const sym = row['scripname'] ?? row['ScripName'] ?? row['Symbol'] ?? row['tradingsymbol'] ?? '';
    if (!sym) continue;
    const rawTime = row['orderdate'] ?? row['OrderDate'] ?? row['trade_date'] ?? row['Trade Date'] ?? '';
    const dateKey = String(rawTime).slice(0, 10).trim() || 'all';
    const groupKey = `${sym.toUpperCase()}::${dateKey}`;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(row);
  }

  for (const [key, symRows] of Object.entries(grouped)) {
    const sym = key.split('::')[0] ?? '';
    try {
      const buys = symRows.filter((r) => (r['transactiontype'] ?? r['TransactionType'] ?? '').toUpperCase() === 'BUY');
      const sells = symRows.filter((r) => (r['transactiontype'] ?? r['TransactionType'] ?? '').toUpperCase() === 'SELL');

      const buyQty = buys.reduce((a, r) => a + safeNum(r['qty'] ?? r['Qty'] ?? r['quantity']), 0);
      const sellQty = sells.reduce((a, r) => a + safeNum(r['qty'] ?? r['Qty'] ?? r['quantity']), 0);

      const buyVal = buys.reduce((a, r) => a + safeNum(r['buyprice'] ?? r['BuyPrice'] ?? r['price']) * safeNum(r['qty'] ?? r['Qty'] ?? r['quantity']), 0);
      const sellVal = sells.reduce((a, r) => a + safeNum(r['sellprice'] ?? r['SellPrice'] ?? r['price']) * safeNum(r['qty'] ?? r['Qty'] ?? r['quantity']), 0);

      const avgBuy = buyQty > 0 ? buyVal / buyQty : 0;
      const avgSell = sellQty > 0 ? sellVal / sellQty : 0;

      const firstAngelRow = symRows[0];
      if (!firstAngelRow) continue;
      const direction: 'LONG' | 'SHORT' = buyQty >= sellQty ? 'LONG' : 'SHORT';
      const qty = Math.max(buyQty, sellQty);
      const grossPnl = direction === 'LONG' ? (avgSell - avgBuy) * qty : (avgBuy - avgSell) * qty;
      const exchange = (firstAngelRow['exchange'] ?? firstAngelRow['Exchange'] ?? 'NSE') as string;
      const openedAt = parseFlexDate(firstAngelRow['orderdate'] ?? firstAngelRow['OrderDate'] ?? firstAngelRow['trade_date']);
      const closedAt = sells.length > 0 ? parseFlexDate(sells[sells.length - 1]!['orderdate'] ?? sells[sells.length - 1]!['OrderDate']) : undefined;

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
        netPnl: grossPnl,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Angel One: Error parsing ${sym}: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseDhan(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  const grouped: Record<string, Record<string, string>[]> = {};
  for (const row of rows) {
    const sym = row['trading_symbol'] ?? row['custom_symbol'] ?? row['Trading Symbol'] ?? row['Symbol'] ?? '';
    if (!sym) continue;
    const rawTime = row['trade_time'] ?? row['Trade Time'] ?? row['exchange_time'] ?? row['order_time'] ?? '';
    const dateKey = String(rawTime).slice(0, 10).trim() || 'all';
    const groupKey = `${sym.toUpperCase()}::${dateKey}`;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(row);
  }

  for (const [key, symRows] of Object.entries(grouped)) {
    const sym = key.split('::')[0] ?? '';
    try {
      const buys = symRows.filter((r) => (r['transaction_type'] ?? r['Transaction Type'] ?? r['type'] ?? '').toUpperCase().includes('BUY'));
      const sells = symRows.filter((r) => (r['transaction_type'] ?? r['Transaction Type'] ?? r['type'] ?? '').toUpperCase().includes('SELL'));

      const buyQty = buys.reduce((a, r) => a + safeNum(r['traded_quantity'] ?? r['quantity'] ?? r['Traded Quantity']), 0);
      const sellQty = sells.reduce((a, r) => a + safeNum(r['traded_quantity'] ?? r['quantity'] ?? r['Traded Quantity']), 0);

      const buyVal = buys.reduce((a, r) => a + safeNum(r['price'] ?? r['traded_price'] ?? r['Price']) * safeNum(r['traded_quantity'] ?? r['quantity']), 0);
      const sellVal = sells.reduce((a, r) => a + safeNum(r['price'] ?? r['traded_price'] ?? r['Price']) * safeNum(r['traded_quantity'] ?? r['quantity']), 0);

      const avgBuy = buyQty > 0 ? buyVal / buyQty : 0;
      const avgSell = sellQty > 0 ? sellVal / sellQty : 0;

      const firstRow = symRows[0];
      if (!firstRow) continue;
      const exchange = (firstRow['exchange'] ?? firstRow['Exchange'] ?? 'NSE') as string;
      const openedAt = parseFlexDate(firstRow['trade_time'] ?? firstRow['Trade Time'] ?? firstRow['exchange_time']);
      const lastSell = sells[sells.length - 1];
      const closedAt = sells.length > 0 && lastSell ? parseFlexDate(lastSell['trade_time'] ?? lastSell['Trade Time']) : undefined;

      const direction: 'LONG' | 'SHORT' = buyQty >= sellQty ? 'LONG' : 'SHORT';
      const qty = Math.max(buyQty, sellQty);
      const grossPnl = direction === 'LONG' ? (avgSell - avgBuy) * qty : (avgBuy - avgSell) * qty;

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
        netPnl: grossPnl,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Dhan: Error parsing ${sym}: ${e.message}`);
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
      const tradeTime = parseFlexDate(row['exchtime'] ?? row['ExchTime'] ?? row['trade_time']);
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
        grossPnl: 0,
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
      const tradeDate = parseFlexDate(row['trade date'] ?? row['Trade Date'] ?? row['date']);

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
    case 'dhan':      result = parseDhan(rows);      break;
    case 'fyers':     result = parseFyers(rows);     break;
    case 'groww':     result = parseGroww(rows);     break;
    default:
      result = { trades: [], errors: ['Could not detect broker format from CSV headers. Supported: Zerodha, Upstox, Angel One, Dhan, Fyers, Groww.'] };
  }

  return {
    broker,
    totalRows: rows.length,
    parsedTrades: result.trades,
    skippedRows: Math.max(0, rows.length - result.trades.length),
    errors: result.errors,
  };
}
