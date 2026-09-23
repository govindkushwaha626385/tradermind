// ──────────────────────────────────────────────
// TradeMind — IBrokerConnector Interface
// Unified adapter pattern for all broker integrations
// ──────────────────────────────────────────────

import type {
  BrokerConnection,
  BrokerProfile,
  AccountBalance,
  PortfolioHolding,
  ActivePosition,
  TradeExecution,
  BrokerId,
} from '@trademind/shared';

export interface BrokerAuthTokens {
  accessToken: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  expiresAt?: Date;
}

export interface BrokerConnectorConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  password?: string;
  totpSeed?: string;
  redirectUri?: string;
}

export interface IBrokerConnector {
  /** Unique broker identifier */
  readonly brokerId: BrokerId;

  /**
   * Generate the OAuth / login URL for the user to authorise the app.
   * Returns a Promise because some implementations resolve app-level
   * credentials from the database at call-time rather than from .env.
   */
  getAuthUrl(state: string): Promise<string> | string;

  /** Exchange auth code / credentials for access tokens */
  authenticate(params: Record<string, string>): Promise<BrokerAuthTokens>;

  /** Refresh expired tokens */
  refreshTokens(refreshToken: string): Promise<BrokerAuthTokens>;

  /** Fetch user profile from broker */
  fetchUserProfile(): Promise<BrokerProfile>;

  /** Fetch account balance/margins */
  fetchAccountBalance(): Promise<AccountBalance>;

  /** Fetch portfolio holdings */
  fetchHoldings(): Promise<PortfolioHolding[]>;

  /** Fetch active positions */
  fetchPositions(): Promise<ActivePosition[]>;

  /** Fetch trade executions/fills (trade book) */
  fetchTradeBook(startDate?: Date, endDate?: Date): Promise<TradeExecution[]>;

  /** Validate connection credentials */
  validateConnection(): Promise<boolean>;
}

/**
 * Factory to get the appropriate broker connector
 */
/**
 * Map of broker connector constructors for dynamic import.
 * Using a map instead of switch/require ensures ESM compatibility.
 */
const CONNECTOR_MAP: Record<string, () => Promise<{ new (config: BrokerConnectorConfig): IBrokerConnector }>> = {
  zerodha: () => import('../connectors/zerodha.connector').then((m) => m.ZerodhaConnector),
  dhan: () => import('../connectors/dhan.connector').then((m) => m.DhanConnector),
  angelone: () => import('../connectors/angelone.connector').then((m) => m.AngelOneConnector),
  upstox: () => import('../connectors/upstox.connector').then((m) => m.UpstoxConnector),
  groww: () => import('../connectors/groww.connector').then((m) => m.GrowwConnector),
  sahi: () => import('../connectors/sahi.connector').then((m) => m.SahiConnector),
  lemonn: () => import('../connectors/lemonn.connector').then((m) => m.LemonnConnector),
  delta_exchange: () => import('../connectors/delta.connector').then((m) => m.DeltaConnector),
};

export async function getBrokerConnector(
  brokerId: BrokerId,
  config: BrokerConnectorConfig,
): Promise<IBrokerConnector> {
  const loader = CONNECTOR_MAP[brokerId];
  if (!loader) {
    throw new Error(`Unsupported broker: ${brokerId}`);
  }
  const ConnectorClass = await loader();
  return new ConnectorClass(config);
}
