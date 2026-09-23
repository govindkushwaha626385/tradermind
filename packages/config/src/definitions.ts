// ──────────────────────────────────────────────
// TradeMind — Dynamic Configuration Manager
// All system configuration is stored in the database
// and cached in memory. Admin can modify any value.
// Nothing is hardcoded.
// ──────────────────────────────────────────────

export type ConfigValue = string | number | boolean | Record<string, unknown> | unknown[];

/**
 * Configuration categories for UI organization
 */
export const CONFIG_CATEGORIES = {
  GENERAL: 'general',
  BROKER: 'broker',
  TAX: 'tax',
  FEES: 'fees',
  SYNC: 'sync',
  RATE_LIMITS: 'rate_limits',
  UI: 'ui',
  NOTIFICATIONS: 'notifications',
  SECURITY: 'security',
  AI: 'ai',
  STORAGE: 'storage',
} as const;

/**
 * Configuration type with metadata
 */
export interface ConfigDefinition<T = ConfigValue> {
  key: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  defaultValue: T;
  category: string;
  isPublic: boolean;
}

/**
 * Default configuration definitions — these are the schema
 * The actual VALUES are stored in the database (admin_configs table)
 * and are loaded at runtime.
 *
 * Only keys that are actively read at runtime are defined here.
 * Keys for broker credentials, per-broker rate limits, tax rates,
 * UI preferences, and other static/table-driven settings have been
 * removed in favor of more appropriate storage (broker_connections,
 * tax_rates table, etc.).
 */
export const CONFIG_DEFINITIONS: ConfigDefinition[] = [
  // ── Zerodha ────────────────────────────
  {
    key: 'broker.zerodha.api_key',
    label: 'Zerodha API Key',
    description: 'App-level API key from Kite Connect developer portal',
    type: 'string',
    defaultValue: '',
    category: CONFIG_CATEGORIES.BROKER,
    isPublic: false,
  },
  {
    key: 'broker.zerodha.api_secret',
    label: 'Zerodha API Secret',
    description: 'App-level API secret from Kite Connect developer portal',
    type: 'string',
    defaultValue: '',
    category: CONFIG_CATEGORIES.BROKER,
    isPublic: false,
  },
  {
    key: 'broker.zerodha.redirect_uri',
    label: 'Zerodha OAuth Redirect URI',
    description: 'Redirect URL for Zerodha OAuth flow',
    type: 'string',
    defaultValue: 'http://localhost:4000/api/v1/brokers/callback',
    category: CONFIG_CATEGORIES.BROKER,
    isPublic: false,
  },
  {
    key: 'broker.zerodha.postback_enabled',
    label: 'Zerodha Postback Enabled',
    description: 'Enable real-time order updates via Kite Postback webhooks',
    type: 'boolean',
    defaultValue: true,
    category: CONFIG_CATEGORIES.BROKER,
    isPublic: false,
  },

  // ── Upstox (OAuth2) ────────────────────
  {
    key: 'broker.upstox.client_id',
    label: 'Upstox Client ID',
    description: 'App-level client ID from Upstox developer dashboard',
    type: 'string',
    defaultValue: '',
    category: CONFIG_CATEGORIES.BROKER,
    isPublic: false,
  },
  {
    key: 'broker.upstox.api_secret',
    label: 'Upstox API Secret',
    description: 'App-level API secret from Upstox developer dashboard',
    type: 'string',
    defaultValue: '',
    category: CONFIG_CATEGORIES.BROKER,
    isPublic: false,
  },
  {
    key: 'broker.upstox.redirect_uri',
    label: 'Upstox OAuth Redirect URI',
    description: 'Redirect URL for Upstox OAuth flow',
    type: 'string',
    defaultValue: 'http://localhost:4000/api/v1/brokers/callback',
    category: CONFIG_CATEGORIES.BROKER,
    isPublic: false,
  },
  {
    key: 'broker.upstox.rate_limit_per_sec',
    label: 'Upstox API Rate Limit (per second)',
    description: 'Maximum API requests per second for Upstox',
    type: 'number',
    defaultValue: 10,
    category: CONFIG_CATEGORIES.BROKER,
    isPublic: false,
  },

  // ── General Fees ───────────────────────
  {
    key: 'fees.brokerage_flat_per_order',
    label: 'Flat Brokerage Per Order (₹)',
    description: 'Default flat brokerage fee charged per order by discount brokers',
    type: 'number',
    defaultValue: 20,
    category: CONFIG_CATEGORIES.FEES,
    isPublic: true,
  },
  {
    key: 'fees.brokerage_percentage',
    label: 'Brokerage Percentage',
    description: 'Percentage-based brokerage fee (0.03% = 0.0003)',
    type: 'number',
    defaultValue: 0.0003,
    category: CONFIG_CATEGORIES.FEES,
    isPublic: true,
  },
  {
    key: 'fees.gst_rate',
    label: 'GST Rate',
    description: 'GST percentage applied on (brokerage + exchange fees + SEBI charges)',
    type: 'number',
    defaultValue: 0.18,
    category: CONFIG_CATEGORIES.FEES,
    isPublic: true,
  },
  {
    key: 'fees.sebi_turnover_fee_per_crore',
    label: 'SEBI Turnover Fee (₹ per crore)',
    description: 'SEBI charges per crore of turnover',
    type: 'number',
    defaultValue: 1050,
    category: CONFIG_CATEGORIES.FEES,
    isPublic: true,
  },

  // ── Rate Limits ─────────────────────────
  {
    key: 'rate_limit.api_requests_per_minute',
    label: 'API Requests Per Minute',
    description: 'Global API rate limit per user per minute',
    type: 'number',
    defaultValue: 60,
    category: CONFIG_CATEGORIES.RATE_LIMITS,
    isPublic: false,
  },

  // ── Analytics ───────────────────────────
  {
    key: 'analytics.mfe_mae_enabled',
    label: 'MFE/MAE Calculation Enabled',
    description: 'Enable real-time MFE/MAE calculation via Polygon.io API',
    type: 'boolean',
    defaultValue: false,
    category: CONFIG_CATEGORIES.GENERAL,
    isPublic: false,
  },

  // ── AI Engine ───────────────────────────
  {
    key: 'ai.enabled',
    label: 'AI Features Enabled',
    description: 'Master toggle for all AI-powered analysis, autopsies, and debriefs',
    type: 'boolean',
    defaultValue: true,
    category: CONFIG_CATEGORIES.AI,
    isPublic: true,
  },
  {
    key: 'ai.provider_primary',
    label: 'Primary AI Provider',
    description: 'Default AI inference provider (gemini or groq)',
    type: 'string',
    defaultValue: 'gemini',
    category: CONFIG_CATEGORIES.AI,
    isPublic: false,
  },
  {
    key: 'ai.gemini_model',
    label: 'Google Gemini Model',
    description: 'Free-tier Gemini model ID (e.g., gemini-2.0-flash or gemini-2.0-flash-lite)',
    type: 'string',
    defaultValue: 'gemini-2.0-flash',
    category: CONFIG_CATEGORIES.AI,
    isPublic: false,
  },
  {
    key: 'ai.groq_model',
    label: 'Groq Model',
    description: 'Free-tier Groq model ID (e.g., llama-3.3-70b-versatile)',
    type: 'string',
    defaultValue: 'llama-3.3-70b-versatile',
    category: CONFIG_CATEGORIES.AI,
    isPublic: false,
  },
  {
    key: 'ai.cache_ttl_hours',
    label: 'AI Cache TTL (Hours)',
    description: 'How long to cache AI autopsy results in hours before re-computing',
    type: 'number',
    defaultValue: 24,
    category: CONFIG_CATEGORIES.AI,
    isPublic: false,
  },
  // ── Storage ──────────────────────────────
  {
    key: 'storage.screenshot_max_mb',
    label: 'Max Screenshot Size (MB)',
    description: 'Maximum allowed image file size for trade screenshot uploads in MB',
    type: 'number',
    defaultValue: 5,
    category: CONFIG_CATEGORIES.STORAGE,
    isPublic: true,
  },
  {
    key: 'storage.audio_max_mb',
    label: 'Max Audio Note Size (MB)',
    description: 'Maximum allowed audio file size for trade voice notes in MB',
    type: 'number',
    defaultValue: 10,
    category: CONFIG_CATEGORIES.STORAGE,
    isPublic: true,
  },
  // ── System & Announcement Banner ─────────
  {
    key: 'system.announcement_banner_enabled',
    label: 'Announcement Banner Active',
    description: 'Master toggle to display a global announcement banner at the top of the app',
    type: 'boolean',
    defaultValue: false,
    category: CONFIG_CATEGORIES.GENERAL,
    isPublic: true,
  },
  {
    key: 'system.announcement_banner_text',
    label: 'Announcement Banner Text',
    description: 'Announcement message displayed in the global banner',
    type: 'string',
    defaultValue: '',
    category: CONFIG_CATEGORIES.GENERAL,
    isPublic: true,
  },
  {
    key: 'system.announcement_banner_type',
    label: 'Announcement Banner Variant',
    description: 'Banner visual style: info, success, warning, or alert',
    type: 'string',
    defaultValue: 'info',
    category: CONFIG_CATEGORIES.GENERAL,
    isPublic: true,
  },
  {
    key: 'system.announcement_banner_link',
    label: 'Announcement Banner Link URL',
    description: 'Optional destination URL or route for the announcement banner call-to-action',
    type: 'string',
    defaultValue: '',
    category: CONFIG_CATEGORIES.GENERAL,
    isPublic: true,
  },
  {
    key: 'system.announcement_banner_link_text',
    label: 'Announcement Banner Link Label',
    description: 'Label for the announcement banner call-to-action button',
    type: 'string',
    defaultValue: 'Learn More',
    category: CONFIG_CATEGORIES.GENERAL,
    isPublic: true,
  },
  {
    key: 'system.maintenance_mode',
    label: 'Maintenance Mode Active',
    description: 'When true, non-admin users see a maintenance notification',
    type: 'boolean',
    defaultValue: false,
    category: CONFIG_CATEGORIES.GENERAL,
    isPublic: true,
  },
];
