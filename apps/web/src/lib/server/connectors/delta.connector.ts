// ──────────────────────────────────────────────
// TradeMind — Delta Exchange (Crypto Derivatives) Connector
//
// Auth: HMAC-SHA256 signature over method + timestamp + path + payload.
// Supports: Crypto perpetuals, futures, and options.
// ──────────────────────────────────────────────

import { createHmac } from 'node:crypto';
import type { BrokerId, TradeExecution } from '@trademind/shared';
import type { IBrokerConnector, BrokerAuthTokens, BrokerConnectorConfig } from './base';

export class DeltaConnector implements IBrokerConnector {
  readonly brokerId: BrokerId = 'delta_exchange';
  private readonly baseUrl = 'https://api.delta.exchange';
  private config: BrokerConnectorConfig;

  constructor(config: BrokerConnectorConfig) {
    this.config = config;
  }

  getAuthUrl(state: string): string {
    // Delta Exchange uses API Key + Secret, not OAuth
    throw new Error('Delta Exchange uses API Key + Secret authentication');
  }

  async authenticate(params: Record<string, string>): Promise<BrokerAuthTokens> {
    const { apiKey, apiSecret } = this.config;
    if (!apiKey || !apiSecret) {
      throw new Error('Delta Exchange requires apiKey and apiSecret');
    }
    return { accessToken: apiKey, apiSecret };
  }

  async refreshTokens(refreshToken: string): Promise<BrokerAuthTokens> {
    throw new Error('Delta Exchange uses static API keys; regenerate from the exchange');
  }

  async fetchUserProfile(): Promise<any> {
    return this.signedRequest('/v2/user/profile');
  }

  async fetchAccountBalance(): Promise<any> {
    return this.signedRequest('/v2/wallet/balances');
  }

  async fetchHoldings(): Promise<any[]> {
    return this.signedRequest('/v2/wallet/balances');
  }

  async fetchPositions(): Promise<any[]> {
    return this.signedRequest('/v2/positions');
  }

  async fetchTradeBook(startDate?: Date, endDate?: Date): Promise<TradeExecution[]> {
    const params: Record<string, string> = {};
    if (startDate) params['start'] = String(startDate.getTime());
    if (endDate) params['end'] = String(endDate.getTime());
    const query = new URLSearchParams(params).toString();
    return this.signedRequest(`/v2/fills${query ? `?${query}` : ''}`);
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.fetchUserProfile();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make a signed request to Delta Exchange.
   * HMAC-SHA256 signature calculated over: method + timestamp + path + body.
   */
  private async signedRequest(
    endpoint: string,
    method = 'GET',
    body?: Record<string, unknown>,
  ): Promise<any> {
    const timestamp = Date.now();
    const payload = body ? JSON.stringify(body) : '';
    const signaturePayload = `${method}${timestamp}${endpoint}${payload}`;
    const signature = createHmac('sha256', this.config.apiSecret ?? '')
      .update(signaturePayload)
      .digest('hex');

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.accessToken ?? this.config.apiKey ?? '',
        'signature': signature,
        'timestamp': String(timestamp),
      },
      body: payload || undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Delta Exchange API error: ${(error as any).error?.message || response.statusText}`);
    }

    return response.json();
  }
}
