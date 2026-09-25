// ──────────────────────────────────────────────
// TradeMind — Shared Constants
// ──────────────────────────────────────────────

export const APP_NAME = 'TradeMind';
export const APP_TAGLINE = 'Know Your Trades. Know Yourself.';
export const APP_DESCRIPTION =
  'Automated multi-asset trading journal with real-time broker sync, candlestick replay, behavioral AI autopsies, and institutional risk analytics for active traders worldwide.';

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

export const TIMEFRAMES = {
  DAY: '1d',
  WEEK: '1w',
  MONTH: '1m',
  QUARTER: '3m',
  YEAR: '1y',
  ALL: 'all',
} as const;

export const CURRENCIES = {
  INR: 'INR',
  USD: 'USD',
} as const;

export const BROKER_DISPLAY_NAMES: Record<string, string> = {
  zerodha: 'Zerodha Kite',
  dhan: 'Dhan HQ',
  angelone: 'Angel One',
  upstox: 'Upstox',
  groww: 'Groww',
  sahi: 'Sahi',
  lemonn: 'Lemonn',
  delta_exchange: 'Delta Exchange',
};

export const BROKER_LOGO_URLS: Record<string, string> = {
  zerodha: '/images/brokers/zerodha.svg',
  dhan: '/images/brokers/dhan.svg',
  angelone: '/images/brokers/angelone.svg',
  upstox: '/images/brokers/upstox.svg',
  groww: '/images/brokers/groww.svg',
  sahi: '/images/brokers/sahi.svg',
  lemonn: '/images/brokers/lemonn.svg',
  delta_exchange: '/images/brokers/delta.svg',
};

export const EMOTION_LABELS: Record<string, string> = {
  FOMO: 'FOMO',
  REVENGE: 'Revenge',
  ANXIOUS: 'Anxious',
  CONFIDENT: 'Confident',
  DISCIPLINED: 'Disciplined',
  GREEDY: 'Greedy',
  HESITANT: 'Hesitant',
  FEAR: 'Fear',
  BOREDOM: 'Boredom',
  NEUTRAL: 'Neutral',
};

export const EMOTION_EMOJIS: Record<string, string> = {
  FOMO: '😰',
  REVENGE: '😤',
  ANXIOUS: '😟',
  CONFIDENT: '😎',
  DISCIPLINED: '🧘',
  GREEDY: '🤑',
  HESITANT: '🤔',
  FEAR: '😨',
  BOREDOM: '😐',
  NEUTRAL: '😶',
};

export const MISTAKE_LABELS: Record<string, string> = {
  EARLY_EXIT: 'Early Exit',
  CHASING_CANDLE: 'Chasing Candle',
  OVERSIZING: 'Oversizing',
  NO_STOP_LOSS: 'No Stop Loss',
  FOMO_ENTRY: 'FOMO Entry',
  REVENGE_TRADE: 'Revenge Trade',
  OVERTRADING: 'Overtrading',
  DEVIATED_FROM_PLAN: 'Deviated from Plan',
  MOVED_SL: 'Moved Stop Loss',
  ADDED_TO_LOSER: 'Added to Loser',
  TRADED_BIAS: 'Traded Bias',
  SKIPPED_CHECKLIST: 'Skipped Checklist',
  POOR_RISK_MGMT: 'Poor Risk Mgmt',
  NO_PREP: 'No Prep',
  IMPULSE_ENTRY: 'Impulse Entry',
};
