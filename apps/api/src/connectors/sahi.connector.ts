// ──────────────────────────────────────────────
// TradeMind — Sahi Connector
//
// Sahi (Aaritya Broking) does not offer a public REST API.
// Trade import is handled via CSV file upload.
//
// Users export their trade book from Sahi's web/app, then
// upload it to TradeMind. The connector parses the CSV.
// ──────────────────────────────────────────────

import type { BrokerId, TradeExecution } from '@trademind/shared';
import type { IBrokerConnector, BrokerAuthTokens, BrokerConnectorConfig } from './base';

export class SahiConnector implements IBrokerConnector {
  readonly brokerId: BrokerId = 'sahi';

  constructor(private config: BrokerConnectorConfig) {}

  getAuthUrl(state: string): string {
    throw new Error('Sahi does not support OAuth. Export your trades as CSV from the Sahi app/web.');
  }

  async authenticate(_params: Record<string, string>): Promise<BrokerAuthTokens> {
    return { accessToken: 'csv_import', apiKey: this.config.apiKey };
  }

  async refreshTokens(_refreshToken: string): Promise<BrokerAuthTokens> {
    throw new Error('Sahi uses CSV import — no token refresh needed.');
  }

  async fetchUserProfile(): Promise<any> {
    return { userName: 'Sahi User', exchangesEnabled: ['NSE', 'BSE', 'NFO', 'MCX'] };
  }

  async fetchAccountBalance(): Promise<any> {
    return { availableCash: 0, usedMargin: 0, totalCollateral: 0, payinAmount: 0, payoutAmount: 0, currency: 'INR' };
  }

  async fetchHoldings(): Promise<any[]> {
    return [];
  }

  async fetchPositions(): Promise<any[]> {
    return [];
  }

  async fetchTradeBook(_startDate?: Date, _endDate?: Date): Promise<TradeExecution[]> {
    return [];
  }

  async validateConnection(): Promise<boolean> {
    return true;
  }
}

/**
 * Parse a Sahi trade export CSV into canonical TradeExecution format.
 *
 * Expected CSV columns (from Sahi):
 *   Symbol, Buy/Sell, Quantity, Price, Trade Date/Time, Order Ref
 */
export function parseSahiCsv(csvContent: string, userId: string, brokerConnectionId: string): TradeExecution[] {
  const lines = csvContent.trim().split('\n');
  const executions: TradeExecution[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 5) continue;

    const [symbol, type, qtyStr, priceStr, dateStr, orderRef] = cols;
    const quantity = parseInt(qtyStr ?? '0', 10);
    const executionPrice = parseFloat(priceStr ?? '0');
    const executionTimestamp = new Date(dateStr ?? new Date());

    if (!quantity || !executionPrice) continue;

    const transactionType = (type ?? '').toUpperCase() === 'BUY' ? 'BUY' as const : 'SELL' as const;

    executions.push({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      brokerConnectionId,
      brokerExecutionId: `sahi_${orderRef ?? i}`,
      brokerOrderId: orderRef ?? `sahi_${i}`,
      exchangeOrderId: undefined,
      tradingsymbol: symbol ?? 'UNKNOWN',
      exchange: 'NSE',
      segment: 'EQUITY',
      transactionType,
      orderType: 'MARKET',
      quantity,
      executionPrice,
      executionTimestamp,
      brokerageFee: 10, // Sahi charges ₹10/executed order
      sttTax: 0,
      exchangeTurnoverFee: 0,
      gstFee: 0,
      sebiCharges: 0,
      stampDuty: 0,
      totalCharges: 10,
      fillHash: `sahi_${orderRef ?? i}_${userId}`,
      createdAt: new Date(),
    });
  }

  return executions;
}
