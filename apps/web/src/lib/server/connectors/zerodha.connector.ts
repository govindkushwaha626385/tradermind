// ──────────────────────────────────────────────
// TradeMind — Zerodha Kite Connect Connector
//
// Auth: OAuth2 + SHA-256 signature.
// App-level credentials (apiKey, apiSecret, redirectUri) are
// loaded from the admin_configs table at runtime — NOT from .env.
// Users connect with their own credentials per connection.
// ──────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { configManager } from '@trademind/config';
import type { BrokerId, TradeExecution } from '@trademind/shared';
import type { IBrokerConnector, BrokerAuthTokens, BrokerConnectorConfig } from './base';

export class ZerodhaConnector implements IBrokerConnector {
  readonly brokerId: BrokerId = 'zerodha';
  private readonly baseUrl = 'https://api.kite.trade';
  private config: Required<BrokerConnectorConfig>;

  constructor(config: BrokerConnectorConfig) {
    this.config = config as Required<BrokerConnectorConfig>;
  }

  /**
   * Build the Zerodha OAuth login URL.
   * App credentials are resolved from the admin config table at call-time.
   */
  async getAuthUrl(state: string): Promise<string> {
    const apiKey = this.config.apiKey || await configManager.get<string>('broker.zerodha.api_key');
    const redirectUri = this.config.redirectUri || await configManager.get<string>('broker.zerodha.redirect_uri');
    return `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async authenticate(params: Record<string, string>): Promise<BrokerAuthTokens> {
    const { request_token: requestToken } = params;
    const { apiKey, apiSecret } = this.config;

    // SHA-256 hash for Zerodha signature
    const checksum = createHash('sha256')
      .update(apiKey + requestToken + apiSecret)
      .digest('hex');

    const response = await fetch(`${this.baseUrl}/session/token`, {
      method: 'POST',
      headers: {
        'X-Kite-Version': '3',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken!,
        checksum,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Zerodha auth failed: ${error.message || response.statusText}`);
    }

    const data = await response.json() as any;
    const expiresAt = new Date();
    expiresAt.setHours(6, 0, 0, 0); // Tokens expire at 6 AM IST daily
    expiresAt.setDate(expiresAt.getDate() + 1);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  async refreshTokens(refreshToken: string): Promise<BrokerAuthTokens> {
    const { apiKey, apiSecret } = this.config;
    const checksum = createHash('sha256')
      .update(apiKey + refreshToken + apiSecret)
      .digest('hex');

    const response = await fetch(`${this.baseUrl}/session/token`, {
      method: 'POST',
      headers: {
        'X-Kite-Version': '3',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        api_key: apiKey,
        refresh_token: refreshToken,
        checksum,
      }),
    });

    if (!response.ok) {
      throw new Error('Zerodha token refresh failed');
    }

    const data = await response.json() as any;
    const expiresAt = new Date();
    expiresAt.setHours(6, 0, 0, 0);
    expiresAt.setDate(expiresAt.getDate() + 1);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  async fetchUserProfile(): Promise<any> {
    return this.request('/user/profile');
  }

  async fetchAccountBalance(): Promise<any> {
    return this.request('/user/margins');
  }

  async fetchHoldings(): Promise<any[]> {
    return this.request('/portfolio/holdings');
  }

  async fetchPositions(): Promise<any[]> {
    return this.request('/portfolio/positions');
  }

  async fetchTradeBook(startDate?: Date, endDate?: Date): Promise<TradeExecution[]> {
    return this.request('/orders/trades');
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.request('/user/profile');
      return true;
    } catch {
      return false;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-Kite-Version': '3',
        'Authorization': `token ${this.config.apiKey}:${this.config.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Zerodha API error: ${(error as any).message || response.statusText}`);
    }

    const data = await response.json() as any;
    return data.data;
  }
}
