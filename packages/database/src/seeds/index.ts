// ──────────────────────────────────────────────
// TradeMind — Seed Data: Default Configs, Tax Rates & Plans
// ──────────────────────────────────────────────

import { getDatabase } from '../client';
import { adminConfigs, taxRates, plans, users } from '../schema';

const DEFAULT_TAX_RATES = [
  // ── STT ─────────────────────────────────
  {
    name: 'STT - Equity Intraday (Sell)',
    description: 'Securities Transaction Tax for equity intraday on sell side',
    segment: 'EQUITY',
    transactionType: 'SELL',
    rateType: 'percentage' as const,
    rateValue: 0.00025,
    appliedOn: 'sell',
    isActive: true,
    priority: 1,
  },
  {
    name: 'STT - Equity Delivery (Buy)',
    description: 'Securities Transaction Tax for equity delivery on buy side',
    segment: 'EQUITY',
    transactionType: 'BUY',
    rateType: 'percentage' as const,
    rateValue: 0.001,
    appliedOn: 'buy',
    isActive: true,
    priority: 1,
  },
  {
    name: 'STT - Equity Delivery (Sell)',
    description: 'Securities Transaction Tax for equity delivery on sell side',
    segment: 'EQUITY',
    transactionType: 'SELL',
    rateType: 'percentage' as const,
    rateValue: 0.001,
    appliedOn: 'sell',
    isActive: true,
    priority: 1,
  },
  {
    name: 'STT - Futures (Sell)',
    description: 'Securities Transaction Tax for futures on sell side',
    segment: 'FNO',
    transactionType: 'SELL',
    rateType: 'percentage' as const,
    rateValue: 0.0002,
    appliedOn: 'sell',
    isActive: true,
    priority: 1,
  },
  {
    name: 'STT - Options Premium (Sell)',
    description: 'STT on options premium for sell side',
    segment: 'FNO',
    transactionType: 'SELL',
    rateType: 'percentage' as const,
    rateValue: 0.001,
    appliedOn: 'sell',
    isActive: true,
    priority: 1,
  },
  {
    name: 'STT - Options Exercise',
    description: 'STT on option intrinsic value if exercised',
    segment: 'FNO',
    transactionType: 'BUY',
    rateType: 'percentage' as const,
    rateValue: 0.00125,
    appliedOn: 'buy',
    isActive: true,
    priority: 2,
  },

  // ── Exchange Turnover ──────────────────
  {
    name: 'Exchange Turnover - Equity',
    description: 'NSE/BSE exchange turnover charge for equity',
    segment: 'EQUITY',
    rateType: 'percentage' as const,
    rateValue: 0.0000297,
    appliedOn: 'both',
    isActive: true,
    priority: 3,
  },
  {
    name: 'Exchange Turnover - Futures',
    description: 'NSE exchange turnover charge for futures',
    segment: 'FNO',
    rateType: 'percentage' as const,
    rateValue: 0.0000197,
    appliedOn: 'both',
    isActive: true,
    priority: 3,
  },
  {
    name: 'Exchange Turnover - Options',
    description: 'NSE exchange turnover charge for options (on premium turnover)',
    segment: 'FNO',
    rateType: 'percentage' as const,
    rateValue: 0.0003503,
    appliedOn: 'both',
    isActive: true,
    priority: 3,
  },

  // ── Stamp Duty ─────────────────────────
  {
    name: 'Stamp Duty - Equity Delivery',
    description: 'Stamp duty for equity delivery (buy side)',
    segment: 'EQUITY',
    rateType: 'percentage' as const,
    rateValue: 0.00015,
    appliedOn: 'buy',
    isActive: true,
    priority: 4,
  },
  {
    name: 'Stamp Duty - Equity Intraday',
    description: 'Stamp duty for equity intraday (buy side)',
    segment: 'EQUITY',
    rateType: 'percentage' as const,
    rateValue: 0.00003,
    appliedOn: 'buy',
    isActive: true,
    priority: 4,
  },
  {
    name: 'Stamp Duty - Futures',
    description: 'Stamp duty for futures (buy side)',
    segment: 'FNO',
    rateType: 'percentage' as const,
    rateValue: 0.00002,
    appliedOn: 'buy',
    isActive: true,
    priority: 4,
  },
  {
    name: 'Stamp Duty - Options',
    description: 'Stamp duty for options (buy side)',
    segment: 'FNO',
    rateType: 'percentage' as const,
    rateValue: 0.00003,
    appliedOn: 'buy',
    isActive: true,
    priority: 4,
  },

  // ── SEBI ────────────────────────────────
  {
    name: 'SEBI Turnover Fee',
    description: 'SEBI charges per crore of turnover',
    segment: 'FNO',
    rateType: 'flat' as const,
    rateValue: 1050,
    appliedOn: 'both',
    minAmount: 0,
    isActive: true,
    priority: 5,
  },
];

const DEFAULT_ADMIN_CONFIGS = [
  {
    key: 'fees.gst_rate',
    value: 0.18,
    type: 'number' as const,
    label: 'GST Rate',
    description: 'GST percentage applied on (brokerage + exchange fees + SEBI charges)',
    category: 'fees',
    isPublic: true,
  },
  {
    key: 'fees.brokerage_flat_per_order',
    value: 20,
    type: 'number' as const,
    label: 'Flat Brokerage Per Order (₹)',
    description: 'Default flat brokerage fee charged per order by discount brokers',
    category: 'fees',
    isPublic: true,
  },
  {
    key: 'fees.brokerage_percentage',
    value: 0.0003,
    type: 'number' as const,
    label: 'Brokerage Percentage',
    description: 'Percentage-based brokerage fee (0.03% = 0.0003)',
    category: 'fees',
    isPublic: true,
  },
  {
    key: 'fees.sebi_turnover_fee_per_crore',
    value: 1050,
    type: 'number' as const,
    label: 'SEBI Turnover Fee (₹ per crore)',
    description: 'SEBI charges per crore of turnover',
    category: 'fees',
    isPublic: true,
  },
  {
    key: 'sync.cron_schedule',
    value: '0 16 * * 1-5',
    type: 'string' as const,
    label: 'Cron Sync Schedule',
    description: 'Cron expression for daily automated trade sync (IST evening)',
    category: 'sync',
    isPublic: false,
  },
  {
    key: 'sync.historical_days_back',
    value: 90,
    type: 'number' as const,
    label: 'Historical Sync Days',
    description: 'Number of days back to sync on initial connection',
    category: 'sync',
    isPublic: false,
  },
  {
    key: 'broker.zerodha.api_rate_limit_per_sec',
    value: 3,
    type: 'number' as const,
    label: 'Zerodha API Rate Limit (per second)',
    description: 'Maximum API requests per second for Zerodha Kite Connect',
    category: 'broker',
    isPublic: false,
  },
  {
    key: 'broker.zerodha.api_key',
    value: '',
    type: 'string' as const,
    label: 'Zerodha API Key',
    description: 'App-level API key from Kite Connect developer portal',
    category: 'broker',
    isPublic: false,
  },
  {
    key: 'broker.zerodha.api_secret',
    value: '',
    type: 'string' as const,
    label: 'Zerodha API Secret',
    description: 'App-level API secret from Kite Connect developer portal',
    category: 'broker',
    isPublic: false,
  },
  {
    key: 'broker.zerodha.redirect_uri',
    value: 'http://localhost:4000/api/v1/brokers/callback',
    type: 'string' as const,
    label: 'Zerodha OAuth Redirect URI',
    category: 'broker',
    isPublic: false,
  },
  {
    key: 'broker.zerodha.postback_enabled',
    value: true,
    type: 'boolean' as const,
    label: 'Zerodha Postback Enabled',
    description: 'Enable real-time order updates via Kite Postback webhooks',
    category: 'broker',
    isPublic: false,
  },
  // ── Upstox (OAuth2) ────────────────────
  {
    key: 'broker.upstox.client_id',
    value: '',
    type: 'string' as const,
    label: 'Upstox Client ID',
    description: 'App-level client ID from Upstox developer dashboard',
    category: 'broker',
    isPublic: false,
  },
  {
    key: 'broker.upstox.api_secret',
    value: '',
    type: 'string' as const,
    label: 'Upstox API Secret',
    description: 'App-level API secret from Upstox developer dashboard',
    category: 'broker',
    isPublic: false,
  },
  {
    key: 'broker.upstox.redirect_uri',
    value: 'http://localhost:4000/api/v1/brokers/callback',
    type: 'string' as const,
    label: 'Upstox OAuth Redirect URI',
    description: 'Redirect URL for Upstox OAuth flow',
    category: 'broker',
    isPublic: false,
  },
  {
    key: 'analytics.mfe_mae_enabled',
    value: false,
    type: 'boolean' as const,
    label: 'MFE/MAE Calculation Enabled',
    description: 'Enable real-time MFE/MAE calculation via Polygon.io API',
    category: 'general',
    isPublic: false,
  },
];

const DEFAULT_PLANS = [
  {
    slug: 'free',
    name: 'Starter',
    description: 'For traders just getting started with journaling.',
    amount: 0,
    currency: 'INR',
    interval: 'free',
    features: {
      maxTradesPerMonth: 50,
      maxBrokerConnections: 1,
      aiInsights: false,
      mfeMae: false,
      csvExport: true,
      playbooks: false,
      teamSharing: false,
    },
    sortOrder: 0,
    isPopular: false,
  },
  {
    slug: 'pro_monthly',
    name: 'Pro',
    description: 'For serious traders who want full analytics.',
    amount: 49900, // ₹499 in paise
    currency: 'INR',
    interval: 'month',
    features: {
      maxTradesPerMonth: -1, // unlimited
      maxBrokerConnections: 3,
      aiInsights: true,
      mfeMae: true,
      csvExport: true,
      playbooks: true,
      teamSharing: false,
    },
    sortOrder: 1,
    isPopular: true,
  },
  {
    slug: 'elite_yearly',
    name: 'Elite',
    description: 'For professional traders and teams.',
    amount: 999900, // ₹9,999 in paise
    currency: 'INR',
    interval: 'year',
    features: {
      maxTradesPerMonth: -1,
      maxBrokerConnections: -1,
      aiInsights: true,
      mfeMae: true,
      csvExport: true,
      playbooks: true,
      teamSharing: true,
    },
    sortOrder: 2,
    isPopular: false,
  },
];

/**
 * Seed the database with default tax rates, admin configs, and plans.
 */
export async function seedDatabase(options?: { force?: boolean }) {
  const db = getDatabase();

  console.log('🌱 Seeding TradeMind database...');

  // ── Seed Tax Rates ─────────────────────
  console.log('  → Seeding tax rates...');
  const existingTaxRates = options?.force ? [] : await db.select().from(taxRates).limit(1);

  if (existingTaxRates.length === 0) {
    for (const rate of DEFAULT_TAX_RATES) {
      await db.insert(taxRates).values({
        ...rate,
        id: undefined,
      });
    }
    console.log(`  ✓ Inserted ${DEFAULT_TAX_RATES.length} tax rates`);
  } else {
    console.log('  - Tax rates already seeded, skipping');
  }

  // ── Seed Admin Configs ─────────────────
  console.log('  → Seeding admin configs...');
  const existingConfigs = await db.select().from(adminConfigs).limit(1);

  if (existingConfigs.length === 0) {
    for (const config of DEFAULT_ADMIN_CONFIGS) {
      await db.insert(adminConfigs).values({
        ...config,
        id: undefined,
      });
    }
    console.log(`  ✓ Inserted ${DEFAULT_ADMIN_CONFIGS.length} admin configs`);
  } else {
    console.log('  - Admin configs already seeded, skipping');
  }

  // ── Seed Plans ────────────────────────
  console.log('  → Seeding subscription plans...');
  const existingPlans = await db.select().from(plans).limit(1);

  if (existingPlans.length === 0) {
    for (const plan of DEFAULT_PLANS) {
      await db.insert(plans).values(plan);
    }
    console.log(`  ✓ Inserted ${DEFAULT_PLANS.length} plans`);
  } else {
    console.log('  - Plans already seeded, skipping');
  }

  console.log('✅ Database seeding complete!');
}
