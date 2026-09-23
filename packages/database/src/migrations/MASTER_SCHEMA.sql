-- ═══════════════════════════════════════════════════════════════════════════
-- TradeMind — MASTER DATABASE SCHEMA (Supabase SQL Editor — Single File)
-- Version: 5.0  |  Built: 2026-09-23
--
-- ✅ SINGLE SOURCE OF TRUTH for TradeMind Database
-- ✅ 100% aligned with all 28 Drizzle ORM TypeScript schema files (39 tables)
-- ✅ Merges all numbered migrations (001–010), complete-setup, and rls-policies
-- ✅ Idempotent — safe to run multiple times without data corruption
-- ✅ Sequential — tables created in strict FK-dependency order
-- ✅ Multi-market: NSE, BSE, NYSE, NASDAQ, BINANCE, MCX
-- ✅ Multi-currency: INR, USD, EUR, GBP
--
-- INSTRUCTIONS:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this ENTIRE file and click "Run"
--   3. All 39 tables, indexes, triggers, RLS policies & seed data are deployed!
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════
-- LOCAL POSTGRES & SUPABASE COMPATIBILITY LAYER
-- (Enables this script to run seamlessly on both local vanilla PostgreSQL & Supabase)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              VARCHAR(255) UNIQUE,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END;
$$;

-- Drop ALL existing RLS policies in public schema for clean, idempotent rerun
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. USERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email              VARCHAR(255) NOT NULL,
  name               VARCHAR(255) NOT NULL,
  role               VARCHAR(20)  NOT NULL DEFAULT 'USER',
  avatar_url         VARCHAR(512),
  preferred_currency VARCHAR(3)   NOT NULL DEFAULT 'INR',
  timezone           VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx  ON public.users(role);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. BROKER CONNECTIONS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.broker_connections (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker_id          VARCHAR(50)   NOT NULL,
  broker_client_id   VARCHAR(100)  NOT NULL,
  label              VARCHAR(255)  NOT NULL DEFAULT '',
  auth_type          VARCHAR(30)   NOT NULL,
  access_token       VARCHAR(2048) NOT NULL,
  refresh_token      VARCHAR(2048),
  api_key            VARCHAR(1024),
  api_secret         VARCHAR(1024),
  token_expires_at   TIMESTAMPTZ,
  status             VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  last_synced_at     TIMESTAMPTZ,
  is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX        IF NOT EXISTS broker_connections_user_id_idx   ON public.broker_connections(user_id);
CREATE INDEX        IF NOT EXISTS broker_connections_broker_id_idx ON public.broker_connections(broker_id);
CREATE INDEX        IF NOT EXISTS broker_connections_status_idx    ON public.broker_connections(status);
CREATE UNIQUE INDEX IF NOT EXISTS broker_connections_user_broker_unique
  ON public.broker_connections(user_id, broker_id, broker_client_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. BROKER PROFILES & ACCOUNT BALANCES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.broker_profiles (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker_connection_id UUID         NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  user_name            VARCHAR(255) NOT NULL,
  email                VARCHAR(255),
  phone                VARCHAR(20),
  exchanges_enabled    VARCHAR[]    NOT NULL DEFAULT '{}',
  user_type            VARCHAR(50)  NOT NULL DEFAULT 'individual',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS broker_profiles_connection_idx ON public.broker_profiles(broker_connection_id);
CREATE INDEX IF NOT EXISTS broker_profiles_user_id_idx   ON public.broker_profiles(user_id);

CREATE TABLE IF NOT EXISTS public.account_balances (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker_connection_id UUID             NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  available_cash       DOUBLE PRECISION NOT NULL DEFAULT 0,
  used_margin          DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_collateral     DOUBLE PRECISION NOT NULL DEFAULT 0,
  payin_amount         DOUBLE PRECISION NOT NULL DEFAULT 0,
  payout_amount        DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency             VARCHAR(10)      NOT NULL DEFAULT 'INR',
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX        IF NOT EXISTS account_balances_connection_idx    ON public.account_balances(broker_connection_id);
CREATE UNIQUE INDEX IF NOT EXISTS account_balances_connection_unique ON public.account_balances(broker_connection_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. PORTFOLIO HOLDINGS & POSITIONS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
  id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker_connection_id  UUID             NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  isin                  VARCHAR(20),
  tradingsymbol         VARCHAR(100)     NOT NULL,
  exchange              VARCHAR(20)      NOT NULL,
  quantity              INTEGER          NOT NULL DEFAULT 0,
  authorized_quantity   INTEGER,
  average_price         DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_price         DOUBLE PRECISION NOT NULL DEFAULT 0,
  pnl                   DOUBLE PRECISION NOT NULL DEFAULT 0,
  day_change_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS holdings_connection_idx      ON public.portfolio_holdings(broker_connection_id);
CREATE INDEX IF NOT EXISTS holdings_user_id_idx         ON public.portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS holdings_symbol_idx          ON public.portfolio_holdings(tradingsymbol);
CREATE INDEX IF NOT EXISTS holdings_user_connection_idx ON public.portfolio_holdings(user_id, broker_connection_id);

CREATE TABLE IF NOT EXISTS public.positions (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker_connection_id UUID             NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  tradingsymbol        VARCHAR(100)     NOT NULL,
  exchange             VARCHAR(20)      NOT NULL,
  segment              VARCHAR(30)      NOT NULL,
  product_type         VARCHAR(20)      NOT NULL,
  quantity             INTEGER          NOT NULL DEFAULT 0,
  buy_quantity         INTEGER          NOT NULL DEFAULT 0,
  sell_quantity        INTEGER          NOT NULL DEFAULT 0,
  buy_average_price    DOUBLE PRECISION NOT NULL DEFAULT 0,
  sell_average_price   DOUBLE PRECISION NOT NULL DEFAULT 0,
  realized_pnl         DOUBLE PRECISION NOT NULL DEFAULT 0,
  unrealized_pnl       DOUBLE PRECISION NOT NULL DEFAULT 0,
  multiplier           DOUBLE PRECISION NOT NULL DEFAULT 1,
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS positions_connection_idx      ON public.positions(broker_connection_id);
CREATE INDEX IF NOT EXISTS positions_user_id_idx         ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS positions_symbol_idx          ON public.positions(tradingsymbol);
CREATE INDEX IF NOT EXISTS positions_symbol_segment_idx  ON public.positions(tradingsymbol, segment);
CREATE INDEX IF NOT EXISTS positions_user_connection_idx ON public.positions(user_id, broker_connection_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PLANS & SUBSCRIPTIONS & INVOICES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.plans (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  amount      INTEGER      NOT NULL DEFAULT 0,
  currency    VARCHAR(3)   NOT NULL DEFAULT 'INR',
  interval    VARCHAR(10)  NOT NULL DEFAULT 'month',
  features    JSONB        NOT NULL DEFAULT '{}',
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_popular  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_unique ON public.plans(slug);
CREATE INDEX        IF NOT EXISTS plans_active_idx  ON public.plans(is_active);
CREATE INDEX        IF NOT EXISTS plans_sort_idx    ON public.plans(sort_order);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id                  UUID         NOT NULL REFERENCES public.plans(id),
  provider                 VARCHAR(20)  NOT NULL,
  provider_subscription_id VARCHAR(255),
  provider_customer_id     VARCHAR(255),
  status                   VARCHAR(20)  NOT NULL DEFAULT 'trialing',
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  canceled_at              TIMESTAMPTZ,
  trial_ends_at            TIMESTAMPTZ,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_unique      ON public.subscriptions(user_id);
CREATE INDEX        IF NOT EXISTS subscriptions_plan_id_idx         ON public.subscriptions(plan_id);
CREATE INDEX        IF NOT EXISTS subscriptions_status_idx          ON public.subscriptions(status);
CREATE INDEX        IF NOT EXISTS subscriptions_provider_sub_idx    ON public.subscriptions(provider_subscription_id);

CREATE TABLE IF NOT EXISTS public.invoices (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id     UUID         REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider            VARCHAR(20)  NOT NULL,
  provider_invoice_id VARCHAR(255),
  amount_paid         INTEGER      NOT NULL DEFAULT 0,
  currency            VARCHAR(3)   NOT NULL DEFAULT 'INR',
  status              VARCHAR(20)  NOT NULL DEFAULT 'paid',
  paid_at             TIMESTAMPTZ,
  raw_provider_data   JSONB,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invoices_user_id_idx          ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS invoices_subscription_idx     ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS invoices_provider_inv_idx     ON public.invoices(provider_invoice_id);
CREATE INDEX IF NOT EXISTS invoices_user_status_idx      ON public.invoices(user_id, status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. USER ONBOARDING
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  has_completed_welcome     BOOLEAN     NOT NULL DEFAULT FALSE,
  has_connected_broker      BOOLEAN     NOT NULL DEFAULT FALSE,
  has_imported_trades       BOOLEAN     NOT NULL DEFAULT FALSE,
  has_journaled_first_trade BOOLEAN     NOT NULL DEFAULT FALSE,
  has_viewed_insights       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_complete               BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_user_id_unique ON public.user_onboarding(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type         VARCHAR(50)  NOT NULL,
  channel      VARCHAR(20)  NOT NULL DEFAULT 'in_app',
  subject      VARCHAR(255) NOT NULL,
  body         TEXT         NOT NULL,
  is_enabled   BOOLEAN      NOT NULL DEFAULT TRUE,
  is_delivered BOOLEAN      NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  metadata     JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx        ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_type_idx           ON public.notifications(type);
CREATE INDEX IF NOT EXISTS notifications_delivered_idx      ON public.notifications(is_delivered);
CREATE INDEX IF NOT EXISTS notifications_user_type_idx      ON public.notifications(user_id, type);
CREATE INDEX IF NOT EXISTS notifications_user_type_time_idx ON public.notifications(user_id, type, created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RISK PROFILES (Behavioral Shield & Kill Switch)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID          NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  daily_loss_limit_abs        NUMERIC(12,2) DEFAULT '0',
  daily_loss_limit_pct        NUMERIC(5,2)  DEFAULT '0',
  max_trades_per_day          INTEGER       DEFAULT 0,
  max_consecutive_losses      INTEGER       DEFAULT 0,
  max_position_size_pct       NUMERIC(5,2)  DEFAULT '0',
  max_open_positions          INTEGER       DEFAULT 0,
  kill_switch_enabled         BOOLEAN       NOT NULL DEFAULT FALSE,
  kill_switch_active          BOOLEAN       NOT NULL DEFAULT FALSE,
  kill_switch_reset_mode      VARCHAR(20)   NOT NULL DEFAULT 'midnight',
  kill_switch_triggered_at    TIMESTAMPTZ,
  kill_switch_reason          TEXT,
  cooldown_minutes_after_loss INTEGER       DEFAULT 0,
  notify_at_75_pct            BOOLEAN       NOT NULL DEFAULT TRUE,
  notify_on_kill_switch       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS risk_profiles_user_id_idx ON public.risk_profiles(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. SETUP PLAYBOOKS & TRADING STRATEGIES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.setup_playbooks (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  entry_criteria TEXT,
  exit_criteria  TEXT,
  risk_rules     JSONB,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS playbooks_user_id_idx ON public.setup_playbooks(user_id);
CREATE INDEX IF NOT EXISTS playbooks_active_idx  ON public.setup_playbooks(user_id, is_active);

CREATE TABLE IF NOT EXISTS public.trading_strategies (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           VARCHAR(100)     NOT NULL,
  description    TEXT,
  market_type    VARCHAR(20)      NOT NULL DEFAULT 'EQUITY',
  timeframe      VARCHAR(20),
  entry_criteria TEXT,
  exit_criteria  TEXT,
  risk_rules     JSONB,
  tags           VARCHAR[],
  win_count      INTEGER          NOT NULL DEFAULT 0,
  loss_count     INTEGER          NOT NULL DEFAULT 0,
  total_trades   INTEGER          NOT NULL DEFAULT 0,
  total_pnl      DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_r_multiple DOUBLE PRECISION,
  is_active      BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS strategies_user_id_idx     ON public.trading_strategies(user_id);
CREATE INDEX IF NOT EXISTS strategies_active_idx      ON public.trading_strategies(user_id, is_active);
CREATE INDEX IF NOT EXISTS strategies_market_type_idx ON public.trading_strategies(market_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. JOURNAL TRADES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.journal_trades (
  id                      UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker_connection_id    UUID             NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  tradingsymbol           VARCHAR(100)     NOT NULL,
  exchange                VARCHAR(20)      NOT NULL,
  asset_class             VARCHAR(30)      NOT NULL,
  direction               VARCHAR(10)      NOT NULL,
  status                  VARCHAR(20)      NOT NULL DEFAULT 'OPEN',
  currency                VARCHAR(10)      NOT NULL DEFAULT 'INR',
  total_quantity          INTEGER          NOT NULL DEFAULT 0,
  open_quantity           INTEGER          NOT NULL DEFAULT 0,
  avg_entry_price         DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_exit_price          DOUBLE PRECISION,
  opened_at               TIMESTAMPTZ      NOT NULL,
  closed_at               TIMESTAMPTZ,
  gross_pnl               DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_fees_and_taxes    DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_pnl                 DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_favorable_excursion DOUBLE PRECISION,
  max_adverse_excursion   DOUBLE PRECISION,
  r_multiple              DOUBLE PRECISION,
  holding_period_minutes  INTEGER,
  trade_type              VARCHAR(10),
  emotions                VARCHAR[],
  setup_playbook_id       UUID             REFERENCES public.setup_playbooks(id) ON DELETE SET NULL,
  strategy_id             UUID             REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
  rule_compliance_score   DOUBLE PRECISION,
  mistake_tags            VARCHAR[],
  trader_notes            VARCHAR(5000),
  audio_note_url          VARCHAR(1024),
  screenshot_urls         VARCHAR[],
  created_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS journal_trades_connection_idx  ON public.journal_trades(broker_connection_id);
CREATE INDEX IF NOT EXISTS journal_trades_user_id_idx     ON public.journal_trades(user_id);
CREATE INDEX IF NOT EXISTS journal_trades_symbol_idx      ON public.journal_trades(tradingsymbol);
CREATE INDEX IF NOT EXISTS journal_trades_status_idx      ON public.journal_trades(status);
CREATE INDEX IF NOT EXISTS journal_trades_opened_at_idx   ON public.journal_trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS journal_trades_user_status_idx ON public.journal_trades(user_id, status);
CREATE INDEX IF NOT EXISTS journal_trades_strategy_idx    ON public.journal_trades(strategy_id);
CREATE INDEX IF NOT EXISTS journal_trades_user_opened_idx ON public.journal_trades(user_id, opened_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. TRADE EXECUTIONS & LINKS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.trade_executions (
  id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker_connection_id  UUID             NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  broker_execution_id   VARCHAR(100)     NOT NULL,
  broker_order_id       VARCHAR(100)     NOT NULL,
  exchange_order_id     VARCHAR(100),
  tradingsymbol         VARCHAR(100)     NOT NULL,
  exchange              VARCHAR(20)      NOT NULL,
  segment               VARCHAR(30)      NOT NULL,
  transaction_type      VARCHAR(10)      NOT NULL,
  order_type            VARCHAR(20)      NOT NULL,
  quantity              INTEGER          NOT NULL,
  execution_price       DOUBLE PRECISION NOT NULL,
  execution_timestamp   TIMESTAMPTZ      NOT NULL,
  currency              VARCHAR(10)      NOT NULL DEFAULT 'INR',
  brokerage_fee         DOUBLE PRECISION NOT NULL DEFAULT 0,
  stt_tax               DOUBLE PRECISION NOT NULL DEFAULT 0,
  exchange_turnover_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
  gst_fee               DOUBLE PRECISION NOT NULL DEFAULT 0,
  sebi_charges          DOUBLE PRECISION NOT NULL DEFAULT 0,
  stamp_duty            DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_charges         DOUBLE PRECISION NOT NULL DEFAULT 0,
  fill_hash             VARCHAR(128)     NOT NULL,
  raw_payload           JSONB,
  created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX        IF NOT EXISTS executions_connection_idx      ON public.trade_executions(broker_connection_id);
CREATE INDEX        IF NOT EXISTS executions_symbol_idx          ON public.trade_executions(tradingsymbol);
CREATE INDEX        IF NOT EXISTS executions_timestamp_idx       ON public.trade_executions(execution_timestamp DESC);
CREATE UNIQUE INDEX IF NOT EXISTS executions_fill_hash_unique    ON public.trade_executions(fill_hash);
CREATE INDEX        IF NOT EXISTS executions_user_symbol_ts_idx  ON public.trade_executions(user_id, tradingsymbol, execution_timestamp);

CREATE TABLE IF NOT EXISTS public.trade_execution_links (
  id                 UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_trade_id   UUID             NOT NULL REFERENCES public.journal_trades(id) ON DELETE CASCADE,
  execution_id       UUID             NOT NULL REFERENCES public.trade_executions(id) ON DELETE CASCADE,
  allocated_quantity INTEGER          NOT NULL,
  allocated_fees     DOUBLE PRECISION NOT NULL DEFAULT 0
);
CREATE INDEX        IF NOT EXISTS execution_links_journal_trade_idx ON public.trade_execution_links(journal_trade_id);
CREATE INDEX        IF NOT EXISTS execution_links_execution_idx     ON public.trade_execution_links(execution_id);
CREATE UNIQUE INDEX IF NOT EXISTS execution_links_unique            ON public.trade_execution_links(journal_trade_id, execution_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. DISCIPLINE ENGINE (Checklists, Plans, Ratings)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  rules             JSONB        NOT NULL DEFAULT '[]',
  setup_playbook_id UUID         REFERENCES public.setup_playbooks(id) ON DELETE SET NULL,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ck_templates_user_id_idx  ON public.checklist_templates(user_id);
CREATE INDEX IF NOT EXISTS ck_templates_playbook_idx ON public.checklist_templates(setup_playbook_id);

CREATE TABLE IF NOT EXISTS public.trade_checklists (
  id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  journal_trade_id      UUID             NOT NULL REFERENCES public.journal_trades(id) ON DELETE CASCADE,
  checklist_template_id UUID             NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  results               JSONB            NOT NULL DEFAULT '[]',
  compliance_score      DOUBLE PRECISION,
  completed_at          TIMESTAMPTZ      DEFAULT NOW(),
  created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX        IF NOT EXISTS tc_user_id_idx       ON public.trade_checklists(user_id);
CREATE INDEX        IF NOT EXISTS tc_trade_id_idx      ON public.trade_checklists(journal_trade_id);
CREATE UNIQUE INDEX IF NOT EXISTS tc_user_trade_unique ON public.trade_checklists(user_id, journal_trade_id);

CREATE TABLE IF NOT EXISTS public.trade_plans (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  journal_trade_id     UUID             NOT NULL REFERENCES public.journal_trades(id) ON DELETE CASCADE,
  planned_entry_price  DOUBLE PRECISION,
  planned_stop_loss    DOUBLE PRECISION,
  planned_take_profit  DOUBLE PRECISION,
  planned_quantity     INTEGER,
  planned_risk_amount  DOUBLE PRECISION,
  planned_rr           DOUBLE PRECISION,
  plan_adherence_score DOUBLE PRECISION,
  entry_slippage       DOUBLE PRECISION,
  exit_slippage        DOUBLE PRECISION,
  sl_hit_exactly       DOUBLE PRECISION,
  tp_hit_exactly       DOUBLE PRECISION,
  created_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX        IF NOT EXISTS tp_user_id_idx       ON public.trade_plans(user_id);
CREATE INDEX        IF NOT EXISTS tp_trade_id_idx      ON public.trade_plans(journal_trade_id);
CREATE UNIQUE INDEX IF NOT EXISTS tp_user_trade_unique ON public.trade_plans(user_id, journal_trade_id);

CREATE TABLE IF NOT EXISTS public.trade_ratings (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  journal_trade_id   UUID        NOT NULL REFERENCES public.journal_trades(id) ON DELETE CASCADE,
  execution_rating   INTEGER,
  plan_rating        INTEGER,
  psychology_rating  INTEGER,
  emotions           VARCHAR[],
  mistake_tags       VARCHAR[],
  reflection         TEXT,
  lesson_learned     TEXT,
  followed_plan      BOOLEAN,
  would_change       BOOLEAN,
  what_would_change  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX        IF NOT EXISTS tr_user_id_idx       ON public.trade_ratings(user_id);
CREATE INDEX        IF NOT EXISTS tr_trade_id_idx      ON public.trade_ratings(journal_trade_id);
CREATE UNIQUE INDEX IF NOT EXISTS tr_user_trade_unique ON public.trade_ratings(user_id, journal_trade_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. PRE-MARKET PLANS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.daily_premarket_plans (
  id                 UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date               VARCHAR(10)      NOT NULL,
  market_bias        VARCHAR(20)      NOT NULL DEFAULT 'NEUTRAL',
  key_levels         TEXT,
  max_daily_loss     DOUBLE PRECISION,
  max_daily_trades   INTEGER,
  max_risk_per_trade DOUBLE PRECISION,
  checklist_items    JSONB            DEFAULT '[]',
  watchlist          JSONB            DEFAULT '[]',
  mental_state       VARCHAR(50),
  notes              TEXT,
  is_locked          BOOLEAN          NOT NULL DEFAULT FALSE,
  locked_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS dpp_user_date_idx ON public.daily_premarket_plans(user_id, date);
CREATE INDEX        IF NOT EXISTS dpp_user_id_idx   ON public.daily_premarket_plans(user_id);
CREATE INDEX        IF NOT EXISTS dpp_date_idx      ON public.daily_premarket_plans(date);

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. USER GOALS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_goals (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         VARCHAR(255)  NOT NULL,
  description   TEXT,
  type          VARCHAR(50)   NOT NULL,
  target_value  NUMERIC(18,4) NOT NULL,
  period        VARCHAR(20)   NOT NULL DEFAULT 'MONTHLY',
  period_start  TIMESTAMPTZ,
  period_end    TIMESTAMPTZ,
  current_value NUMERIC(18,4) DEFAULT '0',
  progress_pct  NUMERIC(6,2)  DEFAULT '0',
  is_completed  BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  completed_at  TIMESTAMPTZ,
  emoji         VARCHAR(10)   DEFAULT '🎯',
  color         VARCHAR(20)   DEFAULT 'blue',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_goals_user_id_idx    ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS user_goals_user_active_idx ON public.user_goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS user_goals_type_idx       ON public.user_goals(type);

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. LEADERBOARD
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.leaderboard_opt_ins (
  user_id      UUID         PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  is_public    BOOLEAN      NOT NULL DEFAULT FALSE,
  display_name VARCHAR(50)  NOT NULL,
  bio          VARCHAR(280),
  twitter_url  VARCHAR(200),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS leaderboard_opt_ins_public_idx ON public.leaderboard_opt_ins(is_public);

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period           VARCHAR(20)      NOT NULL,
  rank             INTEGER          NOT NULL,
  display_name     VARCHAR(50)      NOT NULL,
  avatar_url       VARCHAR(512),
  bio              VARCHAR(280),
  twitter_url      VARCHAR(200),
  total_pnl        DOUBLE PRECISION NOT NULL DEFAULT 0,
  pnl_percent      DOUBLE PRECISION NOT NULL DEFAULT 0,
  win_rate         DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_trades     INTEGER          NOT NULL DEFAULT 0,
  discipline_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  composite_score  DOUBLE PRECISION NOT NULL DEFAULT 0,
  computed_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX        IF NOT EXISTS leaderboard_snapshots_period_rank_idx ON public.leaderboard_snapshots(period, rank);
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_snapshots_user_period_idx ON public.leaderboard_snapshots(user_id, period);
CREATE INDEX        IF NOT EXISTS leaderboard_snapshots_computed_at_idx ON public.leaderboard_snapshots(computed_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 16. DIGITAL PRODUCTS STORE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.products (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(200) NOT NULL,
  description       TEXT         NOT NULL,
  long_description  TEXT,
  product_type      VARCHAR(20)  NOT NULL DEFAULT 'PDF',
  price             INTEGER      NOT NULL DEFAULT 0,
  currency          VARCHAR(10)  NOT NULL DEFAULT 'INR',
  download_url      TEXT,
  video_url         TEXT,
  preview_image_url TEXT,
  tags              JSONB        NOT NULL DEFAULT '[]',
  metadata          JSONB        NOT NULL DEFAULT '{}',
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  is_free           BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  total_sales       INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_active_idx ON public.products(is_active);
CREATE INDEX IF NOT EXISTS products_type_idx   ON public.products(product_type);
CREATE INDEX IF NOT EXISTS products_sort_idx   ON public.products(sort_order);

CREATE TABLE IF NOT EXISTS public.product_orders (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id          UUID         NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  amount_paid         INTEGER      NOT NULL DEFAULT 0,
  currency            VARCHAR(3)   NOT NULL DEFAULT 'INR',
  provider            VARCHAR(20)  NOT NULL DEFAULT 'razorpay',
  provider_order_id   VARCHAR(255),
  provider_payment_id VARCHAR(255),
  provider_signature  VARCHAR(512),
  status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
  raw_provider_data   JSONB,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX        IF NOT EXISTS product_orders_user_id_idx        ON public.product_orders(user_id);
CREATE INDEX        IF NOT EXISTS product_orders_product_id_idx     ON public.product_orders(product_id);
CREATE INDEX        IF NOT EXISTS product_orders_status_idx         ON public.product_orders(status);
CREATE UNIQUE INDEX IF NOT EXISTS product_orders_provider_order_unique ON public.product_orders(provider_order_id);
CREATE INDEX        IF NOT EXISTS product_orders_user_product_idx   ON public.product_orders(user_id, product_id);

CREATE TABLE IF NOT EXISTS public.product_access (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id        UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id          UUID        REFERENCES public.product_orders(id),
  grant_reason      VARCHAR(50) NOT NULL DEFAULT 'purchased',
  download_count    INTEGER     NOT NULL DEFAULT 0,
  last_accessed_at  TIMESTAMPTZ,
  access_granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_access_user_product_unique ON public.product_access(user_id, product_id);
CREATE INDEX        IF NOT EXISTS product_access_user_id_idx        ON public.product_access(user_id);
CREATE INDEX        IF NOT EXISTS product_access_product_id_idx     ON public.product_access(product_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 17. REVIEWS & TESTIMONIALS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating       INTEGER      NOT NULL DEFAULT 5,
  headline     VARCHAR(150) NOT NULL,
  body         TEXT         NOT NULL,
  trader_type  VARCHAR(100),
  is_approved  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_featured  BOOLEAN      NOT NULL DEFAULT FALSE,
  admin_notes  TEXT,
  display_name VARCHAR(100),
  platform     VARCHAR(20)  NOT NULL DEFAULT 'web',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx  ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS reviews_approved_idx ON public.reviews(is_approved);
CREATE INDEX IF NOT EXISTS reviews_featured_idx ON public.reviews(is_featured);
CREATE INDEX IF NOT EXISTS reviews_rating_idx   ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS reviews_created_idx  ON public.reviews(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 18. PARTNERS & AFFILIATE DIRECTORY
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.partners (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255)   NOT NULL,
  slug                VARCHAR(255)   NOT NULL UNIQUE,
  logo_url            VARCHAR(1024),
  website_url         VARCHAR(1024),
  affiliate_url       VARCHAR(2048)  NOT NULL,
  description         TEXT,
  category            VARCHAR(100)   NOT NULL DEFAULT 'discount',
  country             VARCHAR(50)    NOT NULL DEFAULT 'IN',
  is_featured         BOOLEAN        NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN        NOT NULL DEFAULT TRUE,
  display_order       INTEGER        NOT NULL DEFAULT 0,
  commission_note     VARCHAR(500),
  tag                 VARCHAR(100),
  features            VARCHAR(255)[] NOT NULL DEFAULT '{}',
  rating              VARCHAR(10)    DEFAULT '4.8',
  account_opening_fee VARCHAR(100)   DEFAULT 'Free',
  maintenance_charges VARCHAR(100)   DEFAULT '₹0 for 1st Year',
  click_count         INTEGER        NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS partners_active_order_idx ON public.partners(is_active, display_order);
CREATE INDEX IF NOT EXISTS partners_category_idx     ON public.partners(category);
CREATE INDEX IF NOT EXISTS partners_slug_idx         ON public.partners(slug);

-- ═══════════════════════════════════════════════════════════════════════════
-- 19. ADMIN: CONFIGS, TAX RATES, SYNC LOGS, AUDIT LOGS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.admin_configs (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(255)  NOT NULL UNIQUE,
  value       JSONB         NOT NULL,
  type        VARCHAR(20)   NOT NULL DEFAULT 'string',
  label       VARCHAR(255)  NOT NULL,
  description VARCHAR(2000),
  category    VARCHAR(100)  NOT NULL DEFAULT 'general',
  is_public   BOOLEAN       NOT NULL DEFAULT FALSE,
  updated_by  VARCHAR(255),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_configs_key_unique     ON public.admin_configs(key);
CREATE INDEX        IF NOT EXISTS admin_configs_category_idx   ON public.admin_configs(category);
CREATE INDEX        IF NOT EXISTS admin_configs_updated_by_idx ON public.admin_configs(updated_by);

CREATE TABLE IF NOT EXISTS public.tax_rates (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255)     NOT NULL,
  description      VARCHAR(1000),
  segment          VARCHAR(30)      NOT NULL,
  transaction_type VARCHAR(10),
  rate_type        VARCHAR(15)      NOT NULL DEFAULT 'percentage',
  rate_value       DOUBLE PRECISION NOT NULL,
  applied_on       VARCHAR(10)      NOT NULL DEFAULT 'both',
  max_cap          DOUBLE PRECISION,
  min_amount       DOUBLE PRECISION,
  is_active        BOOLEAN          NOT NULL DEFAULT TRUE,
  priority         INTEGER          NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tax_rates_segment_idx ON public.tax_rates(segment);
CREATE INDEX IF NOT EXISTS tax_rates_active_idx  ON public.tax_rates(is_active);

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker_connection_id UUID          NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  sync_type            VARCHAR(20)   NOT NULL,
  status               VARCHAR(20)   NOT NULL DEFAULT 'RUNNING',
  started_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  executions_imported  INTEGER       NOT NULL DEFAULT 0,
  trades_created       INTEGER       NOT NULL DEFAULT 0,
  trades_updated       INTEGER       NOT NULL DEFAULT 0,
  error_message        VARCHAR(2000),
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sync_logs_connection_idx ON public.sync_logs(broker_connection_id);
CREATE INDEX IF NOT EXISTS sync_logs_user_id_idx    ON public.sync_logs(user_id);
CREATE INDEX IF NOT EXISTS sync_logs_status_idx     ON public.sync_logs(status);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id   VARCHAR(255),
  metadata    JSONB,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx   ON public.admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_entity_idx  ON public.admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON public.admin_audit_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 20. INFRASTRUCTURE: AI CACHE, CACHE, RATE LIMITS, JOBS, FLAGS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cache_key   TEXT        NOT NULL,
  result      JSONB       NOT NULL,
  provider    VARCHAR(50),
  tokens_used INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_user_key_idx ON public.ai_cache(user_id, cache_key);
CREATE INDEX        IF NOT EXISTS ai_cache_expires_idx  ON public.ai_cache(expires_at);

CREATE TABLE IF NOT EXISTS public.cache_entries (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cache_entries_expires_idx ON public.cache_entries(expires_at);

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  identifier    TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  request_count INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (identifier, window_start)
);
CREATE INDEX IF NOT EXISTS api_rate_limits_identifier_window_idx ON public.api_rate_limits(identifier, window_start);

CREATE TABLE IF NOT EXISTS public.background_jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  queue        TEXT        NOT NULL,
  job_name     TEXT        NOT NULL,
  payload      JSONB       NOT NULL DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'PENDING',
  attempts     INTEGER     NOT NULL DEFAULT 0,
  max_attempts INTEGER     NOT NULL DEFAULT 3,
  run_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bg_jobs_queue_status_run_at_idx ON public.background_jobs(queue, status, run_at);
CREATE INDEX IF NOT EXISTS bg_jobs_pending_idx             ON public.background_jobs(status, run_at);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
  rules       JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_name_idx ON public.feature_flags(name);

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN');
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTH TRIGGER — Auto-provision on Supabase signup
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'USER', NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_onboarding (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW()) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.risk_profiles (
    user_id, daily_loss_limit_abs, daily_loss_limit_pct,
    max_trades_per_day, max_consecutive_losses,
    kill_switch_enabled, kill_switch_reset_mode,
    notify_at_75_pct, notify_on_kill_switch, created_at, updated_at
  ) VALUES (NEW.id, 10000.00, 3.00, 10, 3, TRUE, 'midnight', TRUE, TRUE, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT DISTINCT table_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_update_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Enable on ALL tables
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_connections    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_holdings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_playbooks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_strategies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_trades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_executions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_execution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_checklists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_ratings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_premarket_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_opt_ins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_access        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_configs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags         ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES — User-Scoped (Data Isolation)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE POLICY users_self_select ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_self_insert ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY users_self_update ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY bc_user_all    ON public.broker_connections    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY bp_user_all    ON public.broker_profiles       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ab_user_all    ON public.account_balances      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ph_user_all    ON public.portfolio_holdings    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY pos_user_all   ON public.positions             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY sub_user_sel   ON public.subscriptions         FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sub_user_ins   ON public.subscriptions         FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sub_user_upd   ON public.subscriptions         FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY inv_user_sel   ON public.invoices              FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY inv_user_ins   ON public.invoices              FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY uo_user_all    ON public.user_onboarding       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY notif_user_all ON public.notifications         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY rp_user_all    ON public.risk_profiles         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY pb_user_all    ON public.setup_playbooks       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ts_user_all    ON public.trading_strategies    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ct_user_all    ON public.checklist_templates   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY jt_user_all    ON public.journal_trades        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY te_user_all    ON public.trade_executions      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tel_user_all   ON public.trade_execution_links FOR ALL
  USING (EXISTS (SELECT 1 FROM public.journal_trades WHERE id = trade_execution_links.journal_trade_id AND user_id = auth.uid()));
CREATE POLICY tch_user_all   ON public.trade_checklists      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tp_user_all    ON public.trade_plans           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tr_user_all    ON public.trade_ratings         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY dpp_user_all   ON public.daily_premarket_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ug_user_all    ON public.user_goals            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY aic_user_all   ON public.ai_cache              FOR ALL USING (auth.uid() = user_id);
CREATE POLICY po_user_all    ON public.product_orders        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY pa_user_all    ON public.product_access        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY reviews_user_own ON public.reviews             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY sl_user_sel    ON public.sync_logs             FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sl_user_ins    ON public.sync_logs             FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sl_user_upd    ON public.sync_logs             FOR UPDATE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES — Public Read (No Auth Required)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE POLICY plans_public_read         ON public.plans                 FOR SELECT USING (is_active = TRUE);
CREATE POLICY products_public_read      ON public.products              FOR SELECT USING (is_active = TRUE);
CREATE POLICY reviews_public_read       ON public.reviews               FOR SELECT USING (is_approved = TRUE);
CREATE POLICY partners_public_read      ON public.partners              FOR SELECT USING (is_active = TRUE);
CREATE POLICY tax_rates_public_read     ON public.tax_rates             FOR SELECT USING (is_active = TRUE);
CREATE POLICY lboard_snapshots_public   ON public.leaderboard_snapshots FOR SELECT USING (TRUE);
CREATE POLICY lboard_optins_public      ON public.leaderboard_opt_ins   FOR SELECT USING (is_public = TRUE);
CREATE POLICY ff_public_read            ON public.feature_flags         FOR SELECT USING (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES — Service Role (Backend API & Background Workers)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE POLICY bg_jobs_service_all    ON public.background_jobs    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY arl_service_all        ON public.api_rate_limits    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY ce_service_all         ON public.cache_entries      FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY audit_logs_service_all ON public.admin_audit_logs   FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY rp_service_all         ON public.risk_profiles      FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY partners_service_all   ON public.partners           FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY ff_service_all         ON public.feature_flags      FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES — Admin Full Access (Overrides all user policies)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE pol_tbl text;
BEGIN
  FOR pol_tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all_%I ON public.%I', pol_tbl, pol_tbl);
    EXECUTE format('CREATE POLICY admin_all_%I ON public.%I FOR ALL USING (public.is_admin())', pol_tbl, pol_tbl);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Subscription Plans (5 tiers)
INSERT INTO public.plans (slug, name, description, amount, currency, interval, features, is_active, sort_order, is_popular) VALUES
  ('free',          'Starter',       'Essential journaling. 1 broker, 50 trades/month.',             0,      'INR', 'free',  '{"maxTradesPerMonth":50,"maxBrokerConnections":1,"aiInsights":false,"replay":false,"leaderboard":false}', TRUE, 0, FALSE),
  ('pro_monthly',   'Pro Monthly',   'Institutional analytics, AI copilot, unlimited trades.',        49900,  'INR', 'month', '{"maxTradesPerMonth":-1,"maxBrokerConnections":5,"aiInsights":true,"replay":true,"leaderboard":true,"export":true}', TRUE, 1, TRUE),
  ('pro_yearly',    'Pro Annual',    'Pro plan billed annually — save 33%.',                         399900, 'INR', 'year',  '{"maxTradesPerMonth":-1,"maxBrokerConnections":5,"aiInsights":true,"replay":true,"leaderboard":true,"export":true}', TRUE, 2, FALSE),
  ('elite_monthly', 'Elite Monthly', 'Full psychology suite, unlimited brokers, API access.',         99900,  'INR', 'month', '{"maxTradesPerMonth":-1,"maxBrokerConnections":-1,"aiInsights":true,"replay":true,"leaderboard":true,"export":true,"prioritySupport":true,"apiAccess":true}', TRUE, 3, FALSE),
  ('elite_yearly',  'Elite Annual',  'Elite plan billed annually — save 33%.',                      799900, 'INR', 'year',  '{"maxTradesPerMonth":-1,"maxBrokerConnections":-1,"aiInsights":true,"replay":true,"leaderboard":true,"export":true,"prioritySupport":true,"apiAccess":true}', TRUE, 4, FALSE)
ON CONFLICT (slug) DO NOTHING;

-- 2. Tax Rates (India + Global Trading Charges)
INSERT INTO public.tax_rates (name, description, segment, transaction_type, rate_type, rate_value, applied_on, is_active, priority) VALUES
  ('STT – Equity Delivery',            'Securities Transaction Tax for equity delivery on buy and sell', 'EQUITY',      'BOTH', 'percentage', 0.1,     'turnover', TRUE, 1),
  ('STT – Equity Intraday',            'Securities Transaction Tax for equity intraday on sell side',    'EQUITY',      'SELL', 'percentage', 0.025,   'turnover', TRUE, 2),
  ('STT – F&O Futures (Sell)',         'Securities Transaction Tax for futures on sell side',            'FNO_FUTURES', 'SELL', 'percentage', 0.02,    'turnover', TRUE, 3),
  ('STT – F&O Options Premium',        'STT on options premium for sell side',                           'FNO_OPTIONS', 'SELL', 'percentage', 0.1,     'turnover', TRUE, 4),
  ('CTT – MCX Commodity (Sell)',       'Commodities Transaction Tax for MCX non-agri sell side',         'COMMODITY',   'SELL', 'percentage', 0.01,    'turnover', TRUE, 5),
  ('GST on Brokerage & Charges',       'Goods and Services Tax on brokerage and transaction fees',       'ALL',         'BOTH', 'percentage', 18.0,    'charges',  TRUE, 6),
  ('SEBI Turnover Charges',            'SEBI regulatory fee per crore of turnover',                      'ALL',         'BOTH', 'percentage', 0.0001,  'turnover', TRUE, 7),
  ('Exchange Transaction Charges NSE', 'NSE transaction charges on total turnover',                      'ALL',         'BOTH', 'percentage', 0.00325, 'turnover', TRUE, 8),
  ('Stamp Duty (Buy)',                 'State stamp duty levied on buy transactions',                    'ALL',         'BUY',  'percentage', 0.015,   'turnover', TRUE, 9)
ON CONFLICT DO NOTHING;

-- 3. Admin Configs (Core App Settings)
INSERT INTO public.admin_configs (key, value, type, label, description, category, is_public) VALUES
  ('maintenance_mode',                 'false',                  'boolean', 'Maintenance Mode',             'Disable app for maintenance',                           'system',   FALSE),
  ('ai_enabled',                       'true',                   'boolean', 'AI Features Enabled',          'Global toggle for AI debrief & autopsies',             'features', FALSE),
  ('leaderboard_enabled',              'true',                   'boolean', 'Leaderboard Enabled',          'Show public leaderboard page',                         'features', TRUE),
  ('max_file_upload_mb',               '10',                     'number',  'Max Upload Size (MB)',         'Max upload limit for screenshots and attachments',     'limits',   FALSE),
  ('support_email',                    '"support@trademind.io"', 'string',  'Support Email',                'Contact email shown to users',                         'general',  TRUE),
  ('app_version',                      '"5.0.0"',                'string',  'App Version',                  'Current active database and API release',              'system',   TRUE),
  ('fees.gst_rate',                    '0.18',                   'number',  'GST Rate',                     'GST percentage applied on brokerage & charges',        'fees',     TRUE),
  ('fees.brokerage_flat_per_order',    '20',                     'number',  'Flat Brokerage Per Order (₹)', 'Default flat fee per executed order',                  'fees',     TRUE),
  ('fees.brokerage_percentage',        '0.0003',                 'number',  'Brokerage Percentage',         'Percentage-based brokerage fee (0.03%)',               'fees',     TRUE),
  ('fees.sebi_turnover_fee_per_crore', '1050',                   'number',  'SEBI Fee (₹ per crore)',       'SEBI charges per crore turnover',                      'fees',     TRUE),
  ('sync.cron_schedule',               '"0 16 * * 1-5"',         'string',  'Cron Sync Schedule',           'Automated trade sync schedule (IST evening)',          'sync',     FALSE),
  ('sync.historical_days_back',        '90',                     'number',  'Historical Sync Days',         'Number of days back to sync on initial connection',    'sync',     FALSE)
ON CONFLICT (key) DO NOTHING;

-- 4. Verified Partners & Affiliate Directory
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
  'https://upstox.com',
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
  'https://www.delta.exchange',
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

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MASTER DATABASE SCHEMA v5.0
-- Tables: 39 | Indexes: 100+ | Triggers: updated_at + auth-provision
-- RLS: User isolation + Admin override + Public reads + Service role
-- Seed: 5 Plans, 9 Tax Rates, 12 Admin Configs, 6 Top Partners
-- ═══════════════════════════════════════════════════════════════════════════
