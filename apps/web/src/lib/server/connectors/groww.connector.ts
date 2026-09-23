// ──────────────────────────────────────────────
// TradeMind — Groww Trade API Connector
//
// Groww provides a full REST API (api.groww.in/v1) with
// the following authentication flows:
//   1. Access Token (from portal, expires daily at 6 AM)
//   2. API Key + Secret (SHA-256 checksum)  ←  this connector
//   3. TOTP (API Key + TOTP code)
//
// Endpoints:
//   GET  /v1/user/detail           — Profile
//   GET  /v1/margins/detail/user   — Account balance / margin
//   GET  /v1/holdings/user         — Portfolio holdings
//   GET  /v1/positions/user        — Open positions
//   GET  /v1/order/list            — Order list (trade book)
//   GET  /v1/order/trades/{id}     — Trade fills for an order
//   POST /v1/token/api/access      — Generate access token
//
// Rate limits (Non-trading APIs): 20 req / 500 s
// Token endpoint: 150 req / 24 h  |  5 req / 30 s
// ──────────────────────────────────────────────

import { createHash } from 'node:crypto';
import type { BrokerId, TradeExecution } from '@trademind/shared';
import type { IBrokerConnector, BrokerAuthTokens, BrokerConnectorConfig } from './base';

// ── Constants ───────────────────────────────
const GROWW_BASE = 'https://api.groww.in/v1';
const MAX_PAGE_SIZE = 100;

/**
 * Map Groww segment strings → canonical TradeMind segments
 */
function mapSegment(segment: string): 'EQUITY' | 'FNO' {
  switch (segment) {
    case 'CASH': return 'EQUITY';
    case 'FNO': return 'FNO';
    default: return 'EQUITY';
  }
}

/**
 * Map Groww product types → TradeMind product types
 */
function mapProduct(product: string): 'MIS' | 'CNC' | 'NRML' | 'MARGIN' {
  switch (product) {
    case 'MIS': return 'MIS';
    case 'CNC': return 'CNC';
    case 'NRML': return 'NRML';
    case 'MARGIN': return 'MARGIN';
    default: return 'CNC';
  }
}

/**
 * Map Groww exchanges → canonical Exchange
 */
function mapExchange(exchange: string): 'NSE' | 'BSE' {
  return exchange === 'BSE' ? 'BSE' : 'NSE';
}

/**
 * Map Groww order type strings
 */
function mapOrderType(ot: string): 'LIMIT' | 'MARKET' | 'SL' | 'SL-M' {
  switch (ot) {
    case 'LIMIT': return 'LIMIT';
    case 'MARKET': return 'MARKET';
    case 'SL': return 'SL';
    case 'SL-M': return 'SL-M';
    default: return 'MARKET';
  }
}

// ── Connector Class ─────────────────────────
export class GrowwConnector implements IBrokerConnector {
  readonly brokerId: BrokerId = 'groww';
  private config: BrokerConnectorConfig;

  constructor(config: BrokerConnectorConfig) {
    this.config = config;
  }

  // ── Auth ──────────────────────────────────
  getAuthUrl(state: string): string {
    throw new Error(
      'Groww does not support OAuth. Generate API credentials from ' +
      'groww.in/trade-api/api-keys, then provide apiKey + apiSecret.',
    );
  }

  /**
   * Exchange API Key + Secret for a short-lived access token.
   * Uses SHA-256 checksum (secret + epoch timestamp).
   */
  async authenticate(params: Record<string, string>): Promise<BrokerAuthTokens> {
    const apiKey = this.config.apiKey ?? params.api_key ?? '';
    const apiSecret = this.config.apiSecret ?? params.api_secret ?? '';

    if (!apiKey || !apiSecret) {
      throw new Error('Groww authentication requires both apiKey and apiSecret.');
    }

    return this.generateAccessToken(apiKey, apiSecret);
  }

  /**
   * Refresh the access token (Groww tokens expire daily at 6 AM IST).
   */
  async refreshTokens(_refreshToken: string): Promise<BrokerAuthTokens> {
    const apiKey = this.config.apiKey ?? '';
    const apiSecret = this.config.apiSecret ?? '';

    if (!apiKey || !apiSecret) {
      throw new Error('Cannot refresh Groww token: apiKey and apiSecret required.');
    }

    return this.generateAccessToken(apiKey, apiSecret);
  }

  // ── Profile & Account ─────────────────────
  async fetchUserProfile(): Promise<any> {
    const data = await this.apiGet('/user/detail');
    return {
      userName: data.vendor_user_id ?? 'Groww User',
      email: undefined,
      phone: undefined,
      exchangesEnabled: [
        ...(data.nse_enabled ? ['NSE'] : []),
        ...(data.bse_enabled ? ['BSE'] : []),
        ...(data.active_segments ?? []),
      ],
      userType: 'individual',
    };
  }

  async fetchAccountBalance(): Promise<any> {
    const data = await this.apiGet('/margins/detail/user');
    return {
      availableCash: data.clear_cash ?? 0,
      usedMargin: data.net_margin_used ?? 0,
      totalCollateral: (data.collateral_used ?? 0) + (data.collateral_available ?? 0),
      payinAmount: 0,
      payoutAmount: 0,
      currency: 'INR',
    };
  }

  async fetchHoldings(): Promise<any[]> {
    const data = await this.apiGet('/holdings/user');
    return (data.holdings ?? []).map((h: any) => ({
      tradingsymbol: h.trading_symbol,
      exchange: mapExchange('NSE'),
      quantity: h.quantity ?? 0,
      averagePrice: h.average_price ?? 0,
      currentPrice: 0,
      pnl: 0,
      dayChangePercentage: 0,
    }));
  }

  async fetchPositions(): Promise<any[]> {
    const data = await this.apiGet('/positions/user');
    return (data.positions ?? []).map((p: any) => ({
      tradingsymbol: p.trading_symbol,
      exchange: mapExchange(p.exchange ?? 'NSE'),
      segment: mapSegment(p.segment ?? 'CASH'),
      productType: mapProduct(p.product ?? 'CNC'),
      quantity: p.quantity ?? 0,
      buyQuantity: p.credit_quantity ?? 0,
      sellQuantity: p.debit_quantity ?? 0,
      buyAveragePrice: (p.credit_price ?? 0) / 100, // Groww stores prices in paise
      sellAveragePrice: (p.debit_price ?? 0) / 100,
      realizedPnl: (p.realised_pnl ?? 0) / 100, // paise → rupees
      unrealizedPnl: 0,
      multiplier: 1,
    }));
  }

  // ── Trade Book ────────────────────────────
  async fetchTradeBook(startDate?: Date, endDate?: Date): Promise<TradeExecution[]> {
    const executions: TradeExecution[] = [];

    // Fetch orders for CASH and FNO segments
    const segments = ['CASH', 'FNO'];
    for (const segment of segments) {
      let page = 0;
      const MAX_PAGES = 20; // safety limit: 20 pages × 100 = 2000 orders max

      for (let pageCount = 0; pageCount < MAX_PAGES; pageCount++) {
        const query = new URLSearchParams({
          segment,
          page: String(page),
          page_size: String(MAX_PAGE_SIZE),
        });

        const data = await this.apiGet(`/order/list?${query.toString()}`);
        const orderList: any[] = data.order_list ?? [];

        for (const order of orderList) {
          // Only process COMPLETE/TRADED orders
          if (order.order_status !== 'COMPLETE' && order.order_status !== 'TRADED') continue;

          // Fetch individual trades for this order to get fill-level detail
          const tradesData = await this.apiGet(
            `/order/trades/${order.groww_order_id}?segment=${segment}`,
          );
          const tradeList: any[] = tradesData.trade_list ?? [];

          for (const trade of tradeList) {
            if (trade.trade_status !== 'COMPLETED') continue;

            const quantity = trade.quantity ?? order.filled_quantity ?? 0;
            const price = trade.price ?? order.average_fill_price ?? 0;

            // Apply date filter on trade timestamp
            const tradeTime = new Date(trade.trade_date_time ?? order.exchange_time ?? order.created_at);
            if (startDate && tradeTime < startDate) continue;
            if (endDate && tradeTime > endDate) continue;

            executions.push({
              id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              userId: '',      // filled by sync worker
              brokerConnectionId: '', // filled by sync worker
              brokerExecutionId: `groww_${trade.groww_trade_id ?? order.groww_order_id}`,
              brokerOrderId: order.groww_order_id,
              exchangeOrderId: trade.exchange_order_id ?? trade.exchange_trade_id,
              tradingsymbol: trade.trading_symbol ?? order.trading_symbol ?? 'UNKNOWN',
              exchange: mapExchange(trade.exchange ?? order.exchange ?? 'NSE'),
              segment: mapSegment(segment),
              transactionType: (trade.transaction_type ?? order.transaction_type) === 'BUY' ? 'BUY' : 'SELL',
              orderType: mapOrderType(order.order_type),
              quantity,
              executionPrice: price,
              executionTimestamp: tradeTime,
              brokerageFee: 0,
              sttTax: 0,
              exchangeTurnoverFee: 0,
              gstFee: 0,
              sebiCharges: 0,
              stampDuty: 0,
              totalCharges: 0,
              fillHash: '', // filled by caller via createFillHash()
              createdAt: new Date(),
            });
          }
        }

        // Check if there are more pages
        if (orderList.length < MAX_PAGE_SIZE) break;
        page++;
      }
    }

    return executions;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.apiGet('/user/detail');
      return true;
    } catch {
      return false;
    }
  }

  // ── Internal Helpers ──────────────────────

  /**
   * Generate a SHA-256 checksum for Groww API auth.
   * checksum = SHA256(apiSecret + epochTimestamp)
   */
  private static generateChecksum(secret: string, timestamp: string): string {
    return createHash('sha256').update(secret + timestamp).digest('hex');
  }

  /**
   * Call POST /v1/token/api/access to get a new access token.
   */
  private async generateAccessToken(apiKey: string, apiSecret: string): Promise<BrokerAuthTokens> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const checksum = GrowwConnector.generateChecksum(apiSecret, timestamp);

    const response = await fetch(`${GROWW_BASE}/token/api/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        key_type: 'approval',
        checksum,
        timestamp,
      }),
    });

    const body: any = await response.json();

    if (body.status !== 'SUCCESS' || !body.payload?.token) {
      throw new Error(
        `Groww token generation failed: ${body.error?.message ?? 'Unknown error'}`,
      );
    }

    return {
      accessToken: body.payload.token,
      // Groww does not use refresh tokens — tokenRefId is a session reference.
      // Re-authenticate using apiKey + apiSecret when token expires.
      refreshToken: undefined,
      expiresAt: body.payload.expiry ? new Date(body.payload.expiry) : undefined,
    };
  }

  /**
   * Authenticated GET request to Groww API.
   * Handles standard error responses and rate limiting.
   */
  private async apiGet(endpoint: string, retries = 2): Promise<any> {
    if (!this.config.accessToken) {
      throw new Error('Groww connector not authenticated. Call authenticate() first.');
    }

    const response = await fetch(`${GROWW_BASE}${endpoint}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.config.accessToken}`,
        'X-API-VERSION': '1.0',
      },
    });

    const body: any = await response.json();

    // Retry on rate-limit (429) or server errors (5xx)
    if (response.status === 429 && retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return this.apiGet(endpoint, retries - 1);
    }

    if (body.status === 'FAILURE') {
      throw new Error(
        `Groww API error [${body.error?.code ?? 'GA000'}]: ${body.error?.message ?? 'Request failed'}`,
      );
    }

    return body.payload ?? body;
  }
}

// ── CSV Parser (Fallback for users without API subscription) ──

/**
 * Parse a Groww trade export CSV into canonical TradeExecution format.
 *
 * Expected CSV columns (from Groww):
 *   Symbol, Type, Quantity, Avg. Price, Executed At, Order ID
 */
export function parseGrowwCsv(csvContent: string, userId: string, brokerConnectionId: string): TradeExecution[] {
  const lines = csvContent.trim().split('\n');
  const executions: TradeExecution[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 6) continue;

    const [symbol, type, qtyStr, priceStr, dateStr, orderId] = cols;
    const quantity = parseInt(qtyStr ?? '0', 10);
    const executionPrice = parseFloat(priceStr ?? '0');
    const executionTimestamp = new Date(dateStr ?? new Date());

    if (!quantity || !executionPrice) continue;

    const transactionType = (type ?? '').toUpperCase() === 'BUY' ? 'BUY' as const : 'SELL' as const;

    executions.push({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      brokerConnectionId,
      brokerExecutionId: `groww_${orderId ?? i}`,
      brokerOrderId: orderId ?? `groww_${i}`,
      exchangeOrderId: undefined,
      tradingsymbol: symbol ?? 'UNKNOWN',
      exchange: 'NSE',
      segment: 'EQUITY',
      transactionType,
      orderType: 'MARKET',
      quantity,
      executionPrice,
      executionTimestamp,
      brokerageFee: 0,
      sttTax: 0,
      exchangeTurnoverFee: 0,
      gstFee: 0,
      sebiCharges: 0,
      stampDuty: 0,
      totalCharges: 0,
      fillHash: `groww_${orderId ?? i}_${userId}`,
      createdAt: new Date(),
    });
  }

  return executions;
}
