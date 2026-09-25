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
 * Safely parse Groww trade timestamps into UTC Date objects.
 * Groww API returns exchange timestamps in Indian Standard Time (IST = UTC+05:30).
 * If parsed naively with new Date("YYYY-MM-DD HH:mm:ss"), it is interpreted as UTC,
 * causing executions to be pushed 5.5 hours into the future.
 */
export function parseGrowwTimestamp(timeInput: any): Date {
  if (!timeInput) return new Date();
  if (timeInput instanceof Date) return timeInput;
  if (typeof timeInput === 'number') {
    return new Date(timeInput > 1e11 ? timeInput : timeInput * 1000);
  }
  const str = String(timeInput).trim();
  if (!str) return new Date();
  if (/^\d+$/.test(str)) {
    const n = Number(str);
    return new Date(n > 1e11 ? n : n * 1000);
  }
  // If string already has a timezone offset (+05:30, -04:00, Z)
  if (/[+-]\d{2}:?\d{2}$|Z$/i.test(str)) {
    return new Date(str);
  }
  // Treat standard date-time string as IST (+05:30)
  const normalized = str.replace(' ', 'T');
  return new Date(`${normalized}+05:30`);
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
    const rawKey = (this.config.apiKey ?? params.api_key ?? params.access_token ?? params.request_token ?? '').trim();
    const rawSecret = (this.config.apiSecret ?? params.api_secret ?? '').trim();

    if (!rawKey) {
      throw new Error(
        'Groww authentication requires an Access Token (click "Generate Access Token" on Groww) or API Key + Secret.',
      );
    }

    // Detect if input is a JWT Bearer access token (starts with 'eyJ' or standard 3-part header.payload.signature)
    const isJwt = rawKey.startsWith('eyJ') || (rawKey.split('.').length === 3 && rawKey.length > 40);

    // 1. Direct Access Token (from "Generate Access Token" on Groww portal)
    // If it's a JWT, or if no secret was provided, treat rawKey directly as the Bearer token
    if (isJwt || !rawSecret) {
      return {
        accessToken: rawKey,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Groww tokens reset daily at 6 AM
      };
    }

    // 2. Standard API Key + Secret checksum generation
    return this.generateAccessToken(rawKey, rawSecret);
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
          // Process executed or traded orders
          const isTradedOrder = ['EXECUTED', 'COMPLETE', 'TRADED', 'FILLED'].includes(
            (order.order_status ?? '').toUpperCase(),
          ) || (order.filled_quantity && order.filled_quantity > 0);

          if (!isTradedOrder) continue;

          // Fetch individual trades for this order to get fill-level detail
          let tradeList: any[] = [];
          try {
            const tradesData = await this.apiGet(
              `/order/trades/${order.groww_order_id}?segment=${segment}`,
            );
            tradeList = tradesData.trade_list ?? [];
          } catch {
            tradeList = [];
          }

          if (tradeList.length > 0) {
            for (const trade of tradeList) {
              const isTradedFill = ['EXECUTED', 'COMPLETED', 'COMPLETE', 'TRADED', 'FILLED'].includes(
                (trade.trade_status ?? '').toUpperCase(),
              ) || (trade.quantity && trade.quantity > 0);

              if (!isTradedFill) continue;

              const quantity = trade.quantity ?? order.filled_quantity ?? 0;
              const price = trade.price ?? order.average_fill_price ?? order.price ?? 0;
              if (quantity <= 0 || price <= 0) continue;

              // Apply date filter on trade timestamp
              const tradeTime = parseGrowwTimestamp(trade.trade_date_time ?? trade.created_at ?? order.exchange_time ?? order.created_at);
              if (startDate && tradeTime < startDate) continue;
              if (endDate && tradeTime > endDate) continue;

              executions.push({
                id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                userId: '',      // filled by sync worker
                brokerConnectionId: '', // filled by sync worker
                brokerExecutionId: `groww_${trade.groww_trade_id ?? trade.exchange_trade_id ?? order.groww_order_id}`,
                brokerOrderId: order.groww_order_id,
                exchangeOrderId: trade.exchange_order_id ?? trade.exchange_trade_id,
                tradingsymbol: trade.trading_symbol ?? order.trading_symbol ?? 'UNKNOWN',
                exchange: mapExchange(trade.exchange ?? order.exchange ?? 'NSE'),
                segment: mapSegment(segment),
                transactionType: (trade.transaction_type ?? order.transaction_type ?? '').toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
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
          } else {
            // Fallback to order fill directly if trade details are not separately listed
            const quantity = order.filled_quantity ?? order.quantity ?? 0;
            const price = order.average_fill_price ?? order.price ?? 0;
            if (quantity > 0 && price > 0) {
              const tradeTime = parseGrowwTimestamp(order.exchange_time ?? order.created_at);
              if ((!startDate || tradeTime >= startDate) && (!endDate || tradeTime <= endDate)) {
                executions.push({
                  id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  userId: '',
                  brokerConnectionId: '',
                  brokerExecutionId: `groww_${order.groww_order_id}`,
                  brokerOrderId: order.groww_order_id,
                  exchangeOrderId: undefined,
                  tradingsymbol: order.trading_symbol ?? 'UNKNOWN',
                  exchange: mapExchange(order.exchange ?? 'NSE'),
                  segment: mapSegment(segment),
                  transactionType: (order.transaction_type ?? '').toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
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
                  fillHash: '',
                  createdAt: new Date(),
                });
              }
            }
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

    let body: any = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok || body?.status !== 'SUCCESS' || !body?.payload?.token) {
      const detail =
        body?.error?.message ||
        body?.message ||
        body?.errorMessage ||
        (typeof body?.error === 'string' ? body.error : null) ||
        (response.status === 401 || response.status === 403
          ? 'Invalid API Key / Secret or Developer approval pending from Groww'
          : `HTTP ${response.status} ${response.statusText || 'Request failed'}`);

      throw new Error(
        `Groww token generation failed: ${detail}. If you do not have an active Groww Developer account, use 1-Click CSV Import instead.`,
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
    const executionTimestamp = parseGrowwTimestamp(dateStr);

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
