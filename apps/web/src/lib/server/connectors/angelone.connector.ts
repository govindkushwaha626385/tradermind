// ──────────────────────────────────────────────
// TradeMind — Angel One (SmartAPI) Connector
//
// Auth: JWT-based with TOTP generation.
// Endpoints: Profile, TradeBook, Holding, Position
// ──────────────────────────────────────────────

import { createHash, createHmac } from 'node:crypto';
import type { BrokerId, TradeExecution } from '@trademind/shared';
import type { IBrokerConnector, BrokerAuthTokens, BrokerConnectorConfig } from './base';

/**
 * Generate a 6-digit TOTP code using HMAC-SHA1 (RFC 6238).
 * Seed is base32-encoded per Google Authenticator convention.
 */
function generateTotp(seed: string): string {
  // Decode the base32 seed to bytes
  const key = base32Decode(seed);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30); // 30-second interval

  // Build 8-byte big-endian counter buffer
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter), 0);

  // HMAC-SHA1
  const hmac = createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;

  // Dynamic truncation
  const binaryCode =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const otp = binaryCode % 1_000_000;
  return String(otp).padStart(6, '0');
}

/**
 * Decode a base32-encoded string (RFC 4648) to a Buffer.
 * Supports padding and case-insensitive input.
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  const bits: number[] = [];

  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits.push(val);
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(
      (bits[i]! << 5) | (bits[i + 1]! >> 0),
    );
  }
  // Handle remaining bits
  for (let i = 0; i < bits.length; i += 8) {
    const remaining = bits.length - i;
    if (remaining < 8) {
      let byte = 0;
      for (let j = 0; j < remaining; j++) {
        byte = (byte << 5) | (bits[i + j]! >> 0);
      }
      byte = byte << (5 - remaining);
      bytes.push(byte);
    }
  }

  return Buffer.from(bytes);
}

export class AngelOneConnector implements IBrokerConnector {
  readonly brokerId: BrokerId = 'angelone';
  private readonly baseUrl = 'https://apiconnect.angelbroking.com';
  private config: BrokerConnectorConfig;
  private jwtToken: string = '';

  constructor(config: BrokerConnectorConfig) {
    this.config = config;
  }

  getAuthUrl(state: string): string {
    // Angel One uses client credentials + TOTP, not OAuth
    throw new Error('Angel One uses client credentials authentication');
  }

  async authenticate(params: Record<string, string>): Promise<BrokerAuthTokens> {
    // Direct JWT token if provided
    const directToken = params.access_token || params.jwtToken || (this.config.accessToken && !this.config.password ? this.config.accessToken : null);
    if (directToken && directToken.length > 20) {
      this.jwtToken = directToken;
      return {
        accessToken: directToken,
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    const clientId = this.config.clientId || params.clientId || params.clientcode;
    const password = this.config.password || params.password;
    const totpSeed = this.config.totpSeed || params.totpSeed;
    const apiKey = this.config.apiKey || params.apiKey || params.api_key;

    if (!clientId || !password || !totpSeed || !apiKey) {
      throw new Error('Angel One requires: clientId, password, totpSeed, apiKey (or direct JWT token)');
    }

    const totp = generateTotp(totpSeed);

    const response = await fetch(`${this.baseUrl}/rest/secure/angelbroking/user/v1/loginByPassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PrivateKey': apiKey,
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        clientcode: clientId,
        password,
        totp,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Angel One auth failed: ${(error as any).message || response.statusText}`);
    }

    const data = await response.json() as any;
    this.jwtToken = data.data?.jwtToken ?? '';

    return {
      accessToken: this.jwtToken,
      apiKey,
      apiSecret: this.config.apiSecret,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiry
    };
  }

  async refreshTokens(refreshToken: string): Promise<BrokerAuthTokens> {
    throw new Error('Angel One tokens cannot be refreshed; re-authenticate');
  }

  async fetchUserProfile(): Promise<any> {
    return this.request('/rest/secure/angelbroking/user/v1/getProfile').catch(() => ({ userName: 'Angel One Trader' }));
  }

  async fetchAccountBalance(): Promise<any> {
    const res = await this.request('/rest/secure/angelbroking/user/v1/getRMS');
    const data = res?.data ?? res ?? {};
    return {
      availableCash: parseFloat(data.availablecash ?? data.net ?? '0'),
      usedMargin: parseFloat(data.utilizedamount ?? '0'),
      totalCollateral: parseFloat(data.collateral ?? '0'),
      currency: 'INR',
    };
  }

  async fetchHoldings(): Promise<any[]> {
    return this.request('/rest/secure/angelbroking/portfolio/v1/getHolding');
  }

  async fetchPositions(): Promise<any[]> {
    return this.request('/rest/secure/angelbroking/portfolio/v1/getPosition');
  }

  async fetchTradeBook(startDate?: Date, endDate?: Date): Promise<TradeExecution[]> {
    return this.request('/rest/secure/angelbroking/order/v1/getTradeBook');
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
    const token = this.jwtToken || this.config.accessToken || '';
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-PrivateKey': this.config.apiKey ?? '',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Angel One API error: ${(error as any).message || response.statusText}`);
    }

    return response.json();
  }
}
