-- ──────────────────────────────────────────────
-- Migration 009: Partners & Affiliate Directory
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partners (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 varchar(255)  NOT NULL,
  slug                 varchar(255)  NOT NULL UNIQUE,
  logo_url             varchar(1024),
  website_url          varchar(1024),
  affiliate_url        varchar(2048) NOT NULL,
  description          text,
  category             varchar(100)  NOT NULL DEFAULT 'discount',
  country              varchar(50)   NOT NULL DEFAULT 'IN',
  is_featured          boolean       NOT NULL DEFAULT false,
  is_active            boolean       NOT NULL DEFAULT true,
  display_order        integer       NOT NULL DEFAULT 0,
  commission_note      varchar(500),
  tag                  varchar(100),
  features             varchar(255)[] NOT NULL DEFAULT '{}',
  rating               varchar(10)   DEFAULT '4.8',
  account_opening_fee  varchar(100)  DEFAULT 'Free',
  maintenance_charges  varchar(100)  DEFAULT '₹0 for 1st Year',
  click_count          integer       NOT NULL DEFAULT 0,
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS partners_active_order_idx ON public.partners (is_active, display_order);
CREATE INDEX IF NOT EXISTS partners_category_idx ON public.partners (category);
CREATE INDEX IF NOT EXISTS partners_slug_idx ON public.partners (slug);

-- Seed initial top partners
INSERT INTO public.partners (
  name, slug, logo_url, website_url, affiliate_url, description, category, country,
  is_featured, is_active, display_order, commission_note, tag, features, rating, account_opening_fee, maintenance_charges
) VALUES
(
  'Zerodha',
  'zerodha',
  'https://zerodha.com/static/images/logo.svg',
  'https://zerodha.com',
  'https://zerodha.com/open-account?c=TRADEMIND',
  'India''s pioneer discount broker with Kite 3.0 web/mobile platform, Console reporting, and direct API integration with TradeMind.',
  'discount',
  'IN',
  true,
  true,
  1,
  '₹0 Brokerage on Equity Delivery | ₹20 per executed order on Intraday & F&O',
  'Most Popular',
  ARRAY['TradeMind Auto-Sync Ready', 'Kite Connect API', 'GTT Orders', 'Zero Delivery Brokerage'],
  '4.9',
  '₹200',
  '₹300/yr'
),
(
  'Dhan',
  'dhan',
  'https://dhan.co/wp-content/uploads/2021/08/dhan-logo.svg',
  'https://dhan.co',
  'https://invite.dhan.co/?join=TRADEMIND',
  'Built specifically for super-traders with TradingView charts directly in browser, webhooks, basket orders, and 100% free developer APIs.',
  'discount',
  'IN',
  true,
  true,
  2,
  '₹0 Brokerage on Equity Delivery | ₹20 or 0.03% on Intraday & F&O',
  'Best for Charts',
  ARRAY['Native TradingView Sync', 'Free Unlimited APIs', 'Fast Scalper Mode', 'Direct Webhooks'],
  '4.9',
  'Free',
  'Zero AMC for Life'
),
(
  'Fyers',
  'fyers',
  'https://fyers.in/assets/images/fyers-logo.svg',
  'https://fyers.in',
  'https://open-account.fyers.in/?utm-source=TRADEMIND',
  'Ultra-fast trading terminal with 30+ years of historical data, TradingView integration, and real-time TradeMind OAuth sync.',
  'discount',
  'IN',
  true,
  true,
  3,
  '₹0 Brokerage on Equity Delivery | Flat ₹20 on F&O trades',
  'Recommended',
  ARRAY['TradeMind OAuth Sync', 'Advanced Options Chain', 'Free API', '30+ Yr Historical Data'],
  '4.8',
  'Free',
  'Zero AMC'
),
(
  'Angel One',
  'angel-one',
  'https://www.angelone.in/static/images/logo.svg',
  'https://www.angelone.in',
  'https://tinyurl.com/angelone-trademind',
  'Leading full-service tech broker offering SmartAPI, algorithmic trade support, and comprehensive advisory across NSE, BSE, MCX.',
  'full_service',
  'IN',
  false,
  true,
  4,
  '₹0 Brokerage on Delivery for 30 days | ₹20 on F&O',
  'Full-Service',
  ARRAY['SmartAPI Gateway', 'Zero Interest MTF Deals', 'ARQ Prime Advisory', 'Options Watchlist'],
  '4.7',
  'Free',
  '₹0 1st Year'
),
(
  'Upstox',
  'upstox',
  'https://upstox.com/assets/images/upstox-logo.svg',
  'https://upstox.com/open-demat-account/?f=TRADEMIND',
  'Backed by Ratan Tata, Upstox Pro platform offers lightning execution, Pro web terminal, and developer-friendly Upstox API v2.',
  'discount',
  'IN',
  false,
  true,
  5,
  '₹0 Brokerage on Delivery | Flat ₹20 per trade on Intraday & Options',
  'Fast Execution',
  ARRAY['Upstox API v2 Support', 'Pro Web Terminal', 'Margin Trading Facility', 'Mutual Funds Zero Fee'],
  '4.7',
  'Free',
  '₹150/yr'
),
(
  'Delta Exchange India',
  'delta-exchange-india',
  'https://www.delta.exchange/assets/delta_logo.svg',
  'https://www.delta.exchange/app/signup/?code=TRADEMIND',
  'FIU-registered crypto derivatives exchange for Indian traders. Trade Bitcoin, Ethereum, and Altcoin futures & options with INR deposits.',
  'crypto',
  'IN',
  true,
  true,
  6,
  '0% Maker Fee for Select Pairs | Flat INR Bank Transfer Deposits',
  'Crypto F&O',
  ARRAY['FIU Compliant', 'INR UPI/IMPS Deposits', 'BTC & ETH Options', 'Up to 100x Leverage'],
  '4.6',
  'Free',
  'Zero AMC'
)
ON CONFLICT (slug) DO NOTHING;
