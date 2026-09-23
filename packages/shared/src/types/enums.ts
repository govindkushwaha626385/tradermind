// ──────────────────────────────────────────────
// TradeMind — Broker & Exchange Enums
// All broker identifiers, auth types, statuses
// ──────────────────────────────────────────────

export const BROKER_IDS = [
  'zerodha',
  'dhan',
  'angelone',
  'upstox',
  'groww',
  'sahi',
  'lemonn',
  'delta_exchange',
] as const;
export type BrokerId = (typeof BROKER_IDS)[number];

export const AUTH_TYPES = ['oauth2', 'api_key_secret', 'jwt_totp', 'csv_import'] as const;
export type AuthType = (typeof AUTH_TYPES)[number];

export const CONNECTION_STATUSES = ['ACTIVE', 'EXPIRED', 'DISCONNECTED', 'ERROR'] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const SEGMENTS = ['EQUITY', 'FNO', 'COMMODITY', 'CURRENCY', 'CRYPTO_DERIVATIVES'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const PRODUCT_TYPES = ['MIS', 'CNC', 'NRML', 'MARGIN', 'PERPETUAL'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const EXCHANGES = ['NSE', 'BSE', 'NFO', 'MCX', 'CDS', 'DELTA'] as const;
export type Exchange = (typeof EXCHANGES)[number];

export const TRANSACTION_TYPES = ['BUY', 'SELL'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const ORDER_TYPES = ['LIMIT', 'MARKET', 'SL', 'SL-M'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ASSET_CLASSES = ['EQUITY', 'FNO_OPTIONS', 'FNO_FUTURES', 'CRYPTO_PERP', 'COMMODITY'] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const SUPPORTED_CURRENCIES = ['INR', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const SUPPORTED_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST · UTC+5:30)', region: 'Asia' },
  { value: 'America/New_York', label: 'America/New York (EST/EDT · UTC-5/-4)', region: 'Americas' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT · UTC-6/-5)', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT · UTC-8/-7)', region: 'Americas' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST · UTC+0/+1)', region: 'Europe' },
  { value: 'Europe/Frankfurt', label: 'Europe/Frankfurt (CET/CEST · UTC+1/+2)', region: 'Europe' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST · UTC+4)', region: 'Middle East' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT · UTC+8)', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST · UTC+9)', region: 'Asia' },
  { value: 'UTC', label: 'Universal Time (UTC)', region: 'Global' },
] as const;

export const TRADE_DIRECTIONS = ['LONG', 'SHORT'] as const;
export type TradeDirection = (typeof TRADE_DIRECTIONS)[number];

export const TRADE_STATUSES = ['OPEN', 'CLOSED', 'PARTIALLY_CLOSED'] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export const EMOTIONS = [
  'FOMO',
  'REVENGE',
  'ANXIOUS',
  'CONFIDENT',
  'DISCIPLINED',
  'GREEDY',
  'HESITANT',
  'FEAR',
  'BOREDOM',
  'NEUTRAL',
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const MISTAKE_TAGS = [
  'EARLY_EXIT',
  'CHASING_CANDLE',
  'OVERSIZING',
  'NO_STOP_LOSS',
  'FOMO_ENTRY',
  'REVENGE_TRADE',
  'OVERTRADING',
  'DEVIATED_FROM_PLAN',
  'MOVED_SL',
  'ADDED_TO_LOSER',
  'TRADED_BIAS',
  'SKIPPED_CHECKLIST',
  'POOR_RISK_MGMT',
  'NO_PREP',
  'IMPULSE_ENTRY',
] as const;
export type MistakeTag = (typeof MISTAKE_TAGS)[number];

export const TRADE_TYPES = ['MANUAL', 'ALGO'] as const;
export type TradeType = (typeof TRADE_TYPES)[number];

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];
