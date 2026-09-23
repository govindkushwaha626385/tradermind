// ──────────────────────────────────────────────
// TradeMind — Dhan HQ Connector
// Auth: API Key + Access Token (header-based)
// ──────────────────────────────────────────────

import type { BrokerId, TradeExecution } from '@trademind/shared';
import type { IBrokerConnector, BrokerAuthTokens, BrokerConnectorConfig } from './base';

export class DhanConnector implements IBrokerConnector {
  readonly brokerId: BrokerId = 'dhan';
  private readonly baseUrl = 'https://api.dhan.co/v2';
  private config: BrokerConnectorConfig;

  constructor(config: BrokerConnectorConfig) {
    this.config = config;
  }

  getAuthUrl(state: string): string {
    // Dhan doesn't use OAuth; tokens are generated from the Dhan HQ portal
    throw new Error('Dhan uses API Key + Access Token authentication. Generate credentials from web.dhan.co');
  }

  async authenticate(params: Record<string, string>): Promise<BrokerAuthTokens> {
    // Dhan tokens are pre-generated from the portal
    return {
      accessToken: params.access_token ?? this.config.accessToken ?? '',
      apiKey: this.config.apiKey,
      apiSecret: this.config.apiSecret,
    };
  }

  async refreshTokens(refreshToken: string): Promise<BrokerAuthTokens> {
    throw new Error('Dhan tokens are static. Re-generate from web.dhan.co');
  }

  async fetchUserProfile(): Promise<any> {
    return this.request('/user/profile');
  }

  async fetchAccountBalance(): Promise<any> {
    return this.request('/funds');
  }

  async fetchHoldings(): Promise<any[]> {
    return this.request('/holdings');
  }

  async fetchPositions(): Promise<any[]> {
    return this.request('/positions');
  }

  async fetchTradeBook(startDate?: Date, endDate?: Date): Promise<TradeExecution[]> {
    const from = startDate?.toISOString().split('T')[0];
    const to = endDate?.toISOString().split('T')[0];
    let endpoint = '/trades';
    if (from && to) {
      endpoint += `?from-date=${from}&to-date=${to}`;
    }
    return this.request(endpoint);
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
        'Content-Type': 'application/json',
        'access-token': this.config.accessToken ?? '',
        'client-id': this.config.clientId ?? '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Dhan API error: ${(error as any).errorMessage || response.statusText}`);
    }

    return response.json();
  }
}
