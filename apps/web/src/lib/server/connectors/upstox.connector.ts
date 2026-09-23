// ──────────────────────────────────────────────
// TradeMind — Upstox v2 Connector
//
// Auth: OAuth2 code exchange.
// Endpoints: Profile, Holdings, Positions, Trade History
// ──────────────────────────────────────────────

import type { BrokerId, TradeExecution } from '@trademind/shared';
import type { IBrokerConnector, BrokerAuthTokens, BrokerConnectorConfig } from './base';
import { configManager } from '@trademind/config';

export class UpstoxConnector implements IBrokerConnector {
  readonly brokerId: BrokerId = 'upstox';
  private readonly baseUrl = 'https://api.upstox.com/v2';
  private config: BrokerConnectorConfig;

  constructor(config: BrokerConnectorConfig) {
    this.config = config;
  }

  async getAuthUrl(state: string): Promise<string> {
    // Resolve app-level credentials from admin_configs table (not .env)
    const clientId = this.config.clientId || await configManager.get<string>('broker.upstox.client_id') || '';
    const redirectUri = this.config.redirectUri || await configManager.get<string>('broker.upstox.redirect_uri') || 'http://localhost:4000/api/v1/brokers/callback';
    return `https://login.upstox.com/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
  }

  async authenticate(params: Record<string, string>): Promise<BrokerAuthTokens> {
    const { code: authCode } = params;
    // Resolve app-level credentials from admin_configs at call-time
    const clientId = this.config.clientId || await configManager.get<string>('broker.upstox.client_id') || '';
    const apiSecret = this.config.apiSecret || await configManager.get<string>('broker.upstox.api_secret') || '';
    const redirectUri = this.config.redirectUri || await configManager.get<string>('broker.upstox.redirect_uri') || 'http://localhost:4000/api/v1/brokers/callback';

    const response = await fetch(`${this.baseUrl}/login/authorization/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        code: authCode!,
        client_id: clientId,
        client_secret: apiSecret,
        redirect_uri: this.config.redirectUri || await configManager.get<string>('broker.upstox.redirect_uri') || 'http://localhost:4000/api/v1/brokers/callback',
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Upstox auth failed: ${(error as any).message || response.statusText}`);
    }

    const data = await response.json() as any;
    const expiresAt = new Date();
    expiresAt.setHours(3, 30, 0, 0); // Tokens expire at 3:30 AM IST daily
    expiresAt.setDate(expiresAt.getDate() + 1);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  async refreshTokens(refreshToken: string): Promise<BrokerAuthTokens> {
    const clientId = this.config.clientId ?? '';
    const apiSecret = this.config.apiSecret ?? '';

    const response = await fetch(`${this.baseUrl}/login/authorization/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: apiSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) throw new Error('Upstox token refresh failed');

    const data = await response.json() as any;
    const expiresAt = new Date();
    expiresAt.setHours(3, 30, 0, 0);
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
    return this.request('/user/get-funds-and-margin');
  }

  async fetchHoldings(): Promise<any[]> {
    return this.request('/portfolio/long-term-holdings');
  }

  async fetchPositions(): Promise<any[]> {
    return this.request('/portfolio/short-term-positions');
  }

  async fetchTradeBook(startDate?: Date, endDate?: Date): Promise<TradeExecution[]> {
    return this.request('/order/trades/get-trades-for-day');
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.fetchUserProfile();
      return true;
    } catch {
      return false;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.config.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Upstox API error: ${(error as any).message || response.statusText}`);
    }

    return response.json();
  }
}
