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

export type SupportedCsvBroker =
  | 'zerodha'
  | 'upstox'
  | 'angelone'
  | 'fyers'
  | 'groww'
  | 'dhan'
  | 'binance'
  | 'bybit'
  | 'ibkr'
  | 'metatrader'
  | 'thinkorswim'
  | 'tradovate'
  | 'webull'
  | 'robinhood'
  | 'universal'
  | 'unknown';

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
  if (h.includes('binance') || (h.includes('market') && h.includes('realized profit'))) return 'binance';
  if (h.includes('bybit') || (h.includes('contracts') && h.includes('closed p&l'))) return 'bybit';
  if (h.includes('ibkr') || (h.includes('conid') && h.includes('basis'))) return 'ibkr';
  if (h.includes('ticket') && (h.includes('open price') || h.includes('close price'))) return 'metatrader';
  if ((h.includes('exec time') || h.includes('pos effect') || h.includes('spread')) && (h.includes('symbol') || h.includes('net price'))) return 'thinkorswim';
  if (h.includes('contract') && (h.includes('buysell') || h.includes('realizedpnl') || h.includes('fillprice') || h.includes('tradovate'))) return 'tradovate';
  if (h.includes('webull') || (h.includes('filled time') && h.includes('total amount'))) return 'webull';
  if (h.includes('robinhood') || (h.includes('trans code') && h.includes('activity date'))) return 'robinhood';

  // Check if minimum required columns exist for Universal CSV
  const hasSymbol = headers.some((k) => /^(symbol|ticker|pair|contract|tradingsymbol|instrument|asset)$/i.test(k.trim()));
  const hasPrice = headers.some((k) => /^(price|avg_price|entry_price|traded_price|execution_price|open_price)$/i.test(k.trim()));
  const hasQty = headers.some((k) => /^(qty|quantity|shares|contracts|amount|size|volume)$/i.test(k.trim()));

  if (hasSymbol && (hasPrice || hasQty)) {
    return 'universal';
  }

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

function parseUniversal(rows: Record<string, string>[], brokerLabel = 'Universal'): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const symKey = Object.keys(row).find((k) =>
        /^(symbol|ticker|pair|contract|tradingsymbol|instrument|asset)$/i.test(k.trim())
      );
      const sym = symKey ? row[symKey]?.trim() : '';
      if (!sym) continue;

      const sideKey = Object.keys(row).find((k) =>
        /^(side|type|action|direction|trade_type|transaction_type)$/i.test(k.trim())
      );
      const sideVal = sideKey ? String(row[sideKey]).toUpperCase() : 'BUY';
      const direction: 'LONG' | 'SHORT' =
        sideVal.includes('SELL') || sideVal.includes('SHORT') ? 'SHORT' : 'LONG';

      const qtyKey = Object.keys(row).find((k) =>
        /^(qty|quantity|shares|contracts|amount|size|executed|volume)$/i.test(k.trim())
      );
      const qty = safeNum(qtyKey ? row[qtyKey] : '1') || 1;

      const priceKey = Object.keys(row).find((k) =>
        /^(price|avg_price|entry_price|traded_price|execution_price|fill_price|open_price)$/i.test(k.trim())
      );
      const price = safeNum(priceKey ? row[priceKey] : '0');

      const exitPriceKey = Object.keys(row).find((k) =>
        /^(exit_price|close_price|closed_price|avg_exit_price)$/i.test(k.trim())
      );
      const exitPrice = exitPriceKey ? safeNum(row[exitPriceKey]) : undefined;

      const dateKey = Object.keys(row).find((k) =>
        /^(date|time|timestamp|datetime|opened_at|trade_date|created_at|open_time)$/i.test(k.trim())
      );
      const openedAt = dateKey ? parseFlexDate(row[dateKey]) : new Date();

      const closeDateKey = Object.keys(row).find((k) =>
        /^(close_date|closed_at|exit_time|close_time)$/i.test(k.trim())
      );
      const closedAt = closeDateKey ? parseFlexDate(row[closeDateKey]) : undefined;

      const pnlKey = Object.keys(row).find((k) =>
        /^(pnl|net_pnl|realized_pnl|profit|net_profit|realized_profit)$/i.test(k.trim())
      );
      const rawPnl = pnlKey ? safeNum(row[pnlKey]) : null;

      const feesKey = Object.keys(row).find((k) =>
        /^(fee|fees|commission|charges|taxes)$/i.test(k.trim())
      );
      const fees = feesKey ? safeNum(row[feesKey]) : 0;

      let grossPnl = rawPnl != null ? rawPnl + fees : 0;
      let netPnl = rawPnl != null ? rawPnl : 0;
      if (rawPnl == null && exitPrice && price > 0) {
        grossPnl = direction === 'LONG' ? (exitPrice - price) * qty : (price - exitPrice) * qty;
        netPnl = grossPnl - fees;
      }

      const isCrypto = /USDT$|BUSD$|USDC$|BTC$|ETH$/i.test(sym) || brokerLabel.toLowerCase().includes('binance') || brokerLabel.toLowerCase().includes('bybit');
      const isForex = /^[A-Z]{6}$/i.test(sym) && (sym.includes('USD') || sym.includes('EUR') || sym.includes('GBP') || sym.includes('JPY'));
      const assetClass = isCrypto ? 'CRYPTO' : isForex ? 'CURRENCY' : guessAssetClass(sym, 'GLOBAL');
      const exchange = isCrypto ? 'CRYPTO' : isForex ? 'FOREX' : (row['exchange'] || 'GLOBAL');

      trades.push({
        tradingsymbol: sym.toUpperCase().replace(/\s+/g, ''),
        exchange,
        assetClass,
        direction,
        status: (closedAt || exitPrice || rawPnl != null) ? 'CLOSED' : 'OPEN',
        totalQuantity: qty,
        avgEntryPrice: price,
        avgExitPrice: exitPrice,
        openedAt,
        closedAt,
        grossPnl,
        totalFeesAndTaxes: fees,
        netPnl,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Row ${i + 1}: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseThinkOrSwim(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const sym = (row['Symbol'] ?? row['symbol'] ?? row['Underlying'] ?? '').trim();
      if (!sym || sym.startsWith('--') || sym.toLowerCase().includes('total')) continue;

      const rawSide = (row['Side'] ?? row['side'] ?? row['Pos Effect'] ?? row['pos effect'] ?? '').toUpperCase();
      const direction: 'LONG' | 'SHORT' = rawSide.includes('SELL') || rawSide.includes('SHORT') ? 'SHORT' : 'LONG';
      const qty = safeNum(row['Qty'] ?? row['qty'] ?? row['Quantity'] ?? '1') || 1;
      const price = safeNum(row['Price'] ?? row['price'] ?? row['Net Price'] ?? '0');
      const openedAt = parseFlexDate(row['Exec Time'] ?? row['exec time'] ?? row['Date'] ?? row['Time']);
      const isOption = Boolean(row['Exp'] || row['Strike'] || row['Type'] || /([A-Z]+)\s*\d{6}[CP]\d+/.test(sym));

      trades.push({
        tradingsymbol: sym.toUpperCase().replace(/\s+/g, ''),
        exchange: 'US_EQUITY',
        assetClass: isOption ? 'OPTIONS' : 'EQUITY',
        direction,
        status: 'CLOSED',
        totalQuantity: qty,
        avgEntryPrice: price,
        openedAt,
        grossPnl: 0,
        totalFeesAndTaxes: 0,
        netPnl: 0,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`ThinkorSwim row ${i + 1}: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseTradovate(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const sym = (row['contract'] ?? row['Contract'] ?? row['symbol'] ?? row['Symbol'] ?? '').trim();
      if (!sym) continue;

      const rawSide = (row['buySell'] ?? row['Side'] ?? row['side'] ?? '').toUpperCase();
      const direction: 'LONG' | 'SHORT' = rawSide.includes('SELL') || rawSide.includes('SHORT') || rawSide === 'S' ? 'SHORT' : 'LONG';
      const qty = safeNum(row['amount'] ?? row['qty'] ?? row['quantity'] ?? '1') || 1;
      const price = safeNum(row['price'] ?? row['fillPrice'] ?? row['Price'] ?? '0');
      const realizedPnl = row['realizedPnL'] ? safeNum(row['realizedPnL']) : 0;
      const fees = safeNum(row['fee'] ?? row['fees'] ?? row['Commission'] ?? '0');
      const openedAt = parseFlexDate(row['timestamp'] ?? row['time'] ?? row['Timestamp'] ?? row['Date']);

      trades.push({
        tradingsymbol: sym.toUpperCase().replace(/\s+/g, ''),
        exchange: 'FUTURES',
        assetClass: 'FUTURES',
        direction,
        status: 'CLOSED',
        totalQuantity: qty,
        avgEntryPrice: price,
        openedAt,
        grossPnl: realizedPnl + fees,
        totalFeesAndTaxes: fees,
        netPnl: realizedPnl,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Tradovate row ${i + 1}: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseWebull(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const sym = (row['Symbol'] ?? row['symbol'] ?? row['Name'] ?? '').trim();
      if (!sym) continue;

      const rawSide = (row['Side'] ?? row['Action'] ?? '').toUpperCase();
      const direction: 'LONG' | 'SHORT' = rawSide.includes('SELL') || rawSide.includes('SHORT') ? 'SHORT' : 'LONG';
      const qty = safeNum(row['Filled'] ?? row['Quantity'] ?? row['qty'] ?? '1') || 1;
      const price = safeNum(row['Price'] ?? row['Avg Price'] ?? '0');
      const openedAt = parseFlexDate(row['Filled Time'] ?? row['Time'] ?? row['Date']);

      trades.push({
        tradingsymbol: sym.toUpperCase().replace(/\s+/g, ''),
        exchange: 'US_EQUITY',
        assetClass: guessAssetClass(sym, 'US_EQUITY'),
        direction,
        status: 'CLOSED',
        totalQuantity: qty,
        avgEntryPrice: price,
        openedAt,
        grossPnl: 0,
        totalFeesAndTaxes: 0,
        netPnl: 0,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Webull row ${i + 1}: ${e.message}`);
    }
  }

  return { trades, errors };
}

function parseRobinhood(rows: Record<string, string>[]): { trades: ParsedCsvTrade[]; errors: string[] } {
  const trades: ParsedCsvTrade[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const sym = (row['Instrument'] ?? row['instrument'] ?? row['Symbol'] ?? '').trim();
      if (!sym) continue;

      const code = (row['Trans Code'] ?? row['Description'] ?? '').toUpperCase();
      if (!code.includes('BUY') && !code.includes('SELL') && !code.includes('BTO') && !code.includes('STC')) continue;

      const direction: 'LONG' | 'SHORT' = code.includes('SELL') || code.includes('STC') || code.includes('STO') ? 'SHORT' : 'LONG';
      const qty = safeNum(row['Quantity'] ?? row['quantity'] ?? '1') || 1;
      const price = safeNum(row['Price'] ?? row['price'] ?? '0');
      const openedAt = parseFlexDate(row['Activity Date'] ?? row['Process Date'] ?? row['date']);

      trades.push({
        tradingsymbol: sym.toUpperCase().replace(/\s+/g, ''),
        exchange: 'US_EQUITY',
        assetClass: guessAssetClass(sym, 'US_EQUITY'),
        direction,
        status: 'CLOSED',
        totalQuantity: qty,
        avgEntryPrice: price,
        openedAt,
        grossPnl: 0,
        totalFeesAndTaxes: 0,
        netPnl: 0,
        tradeType: 'MANUAL',
      });
    } catch (e: any) {
      errors.push(`Robinhood row ${i + 1}: ${e.message}`);
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
    case 'zerodha':     result = parseZerodha(rows);   break;
    case 'upstox':      result = parseUpstox(rows);    break;
    case 'angelone':    result = parseAngelOne(rows);  break;
    case 'dhan':        result = parseDhan(rows);      break;
    case 'fyers':       result = parseFyers(rows);     break;
    case 'groww':       result = parseGroww(rows);     break;
    case 'binance':     result = parseUniversal(rows, 'Binance'); break;
    case 'bybit':       result = parseUniversal(rows, 'Bybit'); break;
    case 'ibkr':        result = parseUniversal(rows, 'Interactive Brokers'); break;
    case 'metatrader':  result = parseUniversal(rows, 'MetaTrader'); break;
    case 'thinkorswim': result = parseThinkOrSwim(rows); break;
    case 'tradovate':   result = parseTradovate(rows); break;
    case 'webull':      result = parseWebull(rows); break;
    case 'robinhood':   result = parseRobinhood(rows); break;
    case 'universal':   result = parseUniversal(rows, 'Universal'); break;
    default: {
      const fallback = parseUniversal(rows, 'Smart Fallback');
      if (fallback.trades.length > 0) {
        result = fallback;
      } else {
        result = { trades: [], errors: ['Could not detect columns. CSV should contain at least Symbol, Quantity, and Price columns.'] };
      }
    }
  }

  return {
    broker,
    totalRows: rows.length,
    parsedTrades: result.trades,
    skippedRows: Math.max(0, rows.length - result.trades.length),
    errors: result.errors,
  };
}
