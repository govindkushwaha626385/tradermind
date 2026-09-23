-- ═══════════════════════════════════════════════════════════════════════════
-- TradeMind — MASTER DATABASE SCHEMA (Supabase-Ready)
-- Version: 3.0  |  Updated: 2026-09-23
--
-- Single, sequential, complete schema definition.
-- Perfectly aligned with all Drizzle ORM TypeScript models.
-- Currencies supported: INR (₹) and USD ($).
--
-- INSTRUCTIONS FOR SUPABASE:
--   1. Open Supabase Dashboard -> SQL Editor
--   2. Paste this entire file and click "Run"
--   3. All 39 tables, indexes, RLS policies, and triggers will be created.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS & AUTH
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                VARCHAR(255) NOT NULL UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  role                 VARCHAR(20)  NOT NULL DEFAULT 'USER',
  avatar_url           VARCHAR(512),
  preferred_currency   VARCHAR(10)  NOT NULL DEFAULT 'INR', -- 'INR' or 'USD'
  timezone             VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx  ON users(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BROKER CONNECTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_connections (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_id            VARCHAR(50)   NOT NULL,
  broker_client_id     VARCHAR(100)  NOT NULL,
  label                VARCHAR(255)  NOT NULL DEFAULT '',
  auth_type            VARCHAR(30)   NOT NULL,
  access_token         VARCHAR(2048) NOT NULL,
  refresh_token        VARCHAR(2048),
  api_key              VARCHAR(1024),
  api_secret           VARCHAR(1024),
  token_expires_at     TIMESTAMPTZ,
  status               VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  last_synced_at       TIMESTAMPTZ,
  is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bc_user_id_idx   ON broker_connections(user_id);
CREATE INDEX IF NOT EXISTS bc_broker_id_idx ON broker_connections(broker_id);
CREATE INDEX IF NOT EXISTS bc_status_idx    ON broker_connections(status);
CREATE UNIQUE INDEX IF NOT EXISTS bc_user_broker_unique ON broker_connections(user_id, broker_id, broker_client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BROKER PROFILES & ACCOUNT BALANCES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_profiles (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_connection_id UUID         NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,
  user_name            VARCHAR(255) NOT NULL,
  email                VARCHAR(255),
  phone                VARCHAR(20),
  exchanges_enabled    TEXT[]       NOT NULL DEFAULT '{}',
  user_type            VARCHAR(50)  NOT NULL DEFAULT 'individual',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bp_connection_idx ON broker_profiles(broker_connection_id);
CREATE INDEX IF NOT EXISTS bp_user_id_idx    ON broker_profiles(user_id);

CREATE TABLE IF NOT EXISTS account_balances (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_connection_id UUID             NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,
  available_cash       DOUBLE PRECISION NOT NULL DEFAULT 0,
  used_margin          DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_collateral     DOUBLE PRECISION NOT NULL DEFAULT 0,
  payin_amount         DOUBLE PRECISION NOT NULL DEFAULT 0,
  payout_amount        DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency             VARCHAR(10)      NOT NULL DEFAULT 'INR', -- 'INR' or 'USD'
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ab_connection_idx ON account_balances(broker_connection_id);
CREATE UNIQUE INDEX IF NOT EXISTS ab_connection_unique ON account_balances(broker_connection_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HOLDINGS & POSITIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_connection_id  UUID             NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS holdings_connection_idx ON portfolio_holdings(broker_connection_id);
CREATE INDEX IF NOT EXISTS holdings_user_id_idx    ON portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS holdings_symbol_idx     ON portfolio_holdings(tradingsymbol);
CREATE INDEX IF NOT EXISTS holdings_user_conn_idx  ON portfolio_holdings(user_id, broker_connection_id);

CREATE TABLE IF NOT EXISTS positions (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_connection_id UUID             NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,
  tradingsymbol        VARCHAR(100)     NOT NULL,
  exchange             VARCHAR(20)      NOT NULL,
  segment              VARCHAR(30)      NOT NULL,
  product              VARCHAR(20)      NOT NULL,
  quantity             INTEGER          NOT NULL DEFAULT 0,
  overnight_quantity   INTEGER          NOT NULL DEFAULT 0,
  multiplier           DOUBLE PRECISION NOT NULL DEFAULT 1,
  average_price        DOUBLE PRECISION NOT NULL DEFAULT 0,
  close_price          DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_price           DOUBLE PRECISION NOT NULL DEFAULT 0,
  value                DOUBLE PRECISION NOT NULL DEFAULT 0,
  pnl                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  m2m                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  unrealized_pnl       DOUBLE PRECISION NOT NULL DEFAULT 0,
  realized_pnl         DOUBLE PRECISION NOT NULL DEFAULT 0,
  buy_quantity         INTEGER          NOT NULL DEFAULT 0,
  buy_price            DOUBLE PRECISION NOT NULL DEFAULT 0,
  buy_value            DOUBLE PRECISION NOT NULL DEFAULT 0,
  sell_quantity        INTEGER          NOT NULL DEFAULT 0,
  sell_price           DOUBLE PRECISION NOT NULL DEFAULT 0,
  sell_value           DOUBLE PRECISION NOT NULL DEFAULT 0,
  day_buy_quantity     INTEGER          NOT NULL DEFAULT 0,
  day_buy_price        DOUBLE PRECISION NOT NULL DEFAULT 0,
  day_buy_value        DOUBLE PRECISION NOT NULL DEFAULT 0,
  day_sell_quantity    INTEGER          NOT NULL DEFAULT 0,
  day_sell_price       DOUBLE PRECISION NOT NULL DEFAULT 0,
  day_sell_value       DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS positions_connection_idx ON positions(broker_connection_id);
CREATE INDEX IF NOT EXISTS positions_user_id_idx    ON positions(user_id);
CREATE INDEX IF NOT EXISTS positions_symbol_idx     ON positions(tradingsymbol);
CREATE INDEX IF NOT EXISTS positions_user_conn_idx  ON positions(user_id, broker_connection_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRADING STRATEGIES & PLAYBOOKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trading_strategies (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  market_type      VARCHAR(30)  NOT NULL DEFAULT 'EQUITY',
  timeframe        VARCHAR(20),
  entry_criteria   TEXT,
  exit_criteria    TEXT,
  risk_rules       TEXT,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  tags             TEXT[]       DEFAULT '{}',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ts_user_id_idx ON trading_strategies(user_id);
CREATE INDEX IF NOT EXISTS ts_active_idx  ON trading_strategies(is_active);

CREATE TABLE IF NOT EXISTS setup_playbooks (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    VARCHAR(2000),
  entry_criteria VARCHAR(4000),
  exit_criteria  VARCHAR(4000),
  risk_rules     JSONB,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS playbooks_user_id_idx ON setup_playbooks(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. JOURNAL TRADES & EXECUTIONS (Fills)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_trades (
  id                      UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_connection_id    UUID             NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,
  tradingsymbol           VARCHAR(100)     NOT NULL,
  exchange                VARCHAR(20)      NOT NULL,
  asset_class             VARCHAR(30)      NOT NULL,
  direction               VARCHAR(10)      NOT NULL,
  status                  VARCHAR(20)      NOT NULL DEFAULT 'OPEN',
  currency                VARCHAR(10)      NOT NULL DEFAULT 'INR', -- 'INR' or 'USD'
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
  emotions                TEXT[],
  setup_playbook_id       UUID,
  strategy_id             UUID REFERENCES trading_strategies(id) ON DELETE SET NULL,
  rule_compliance_score   DOUBLE PRECISION,
  mistake_tags            TEXT[],
  trader_notes            VARCHAR(5000),
  audio_note_url          VARCHAR(1024),
  screenshot_urls         TEXT[],
  created_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS jt_user_id_idx     ON journal_trades(user_id);
CREATE INDEX IF NOT EXISTS jt_conn_idx        ON journal_trades(broker_connection_id);
CREATE INDEX IF NOT EXISTS jt_symbol_idx      ON journal_trades(tradingsymbol);
CREATE INDEX IF NOT EXISTS jt_status_idx      ON journal_trades(status);
CREATE INDEX IF NOT EXISTS jt_opened_at_idx   ON journal_trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS jt_user_status_idx ON journal_trades(user_id, status);
CREATE INDEX IF NOT EXISTS jt_strategy_idx    ON journal_trades(strategy_id);

CREATE TABLE IF NOT EXISTS trade_executions (
  id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_connection_id  UUID             NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,
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
  currency              VARCHAR(10)      NOT NULL DEFAULT 'INR', -- 'INR' or 'USD'
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
CREATE INDEX IF NOT EXISTS executions_conn_idx   ON trade_executions(broker_connection_id);
CREATE INDEX IF NOT EXISTS executions_symbol_idx ON trade_executions(tradingsymbol);
CREATE INDEX IF NOT EXISTS executions_ts_idx     ON trade_executions(execution_timestamp DESC);
CREATE UNIQUE INDEX IF NOT EXISTS executions_fill_hash_unique ON trade_executions(fill_hash);
CREATE INDEX IF NOT EXISTS executions_user_symbol_ts_idx ON trade_executions(user_id, tradingsymbol, execution_timestamp);

CREATE TABLE IF NOT EXISTS trade_execution_links (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_trade_id   UUID NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,
  trade_execution_id UUID NOT NULL REFERENCES trade_executions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS links_trade_idx     ON trade_execution_links(journal_trade_id);
CREATE INDEX IF NOT EXISTS links_execution_idx ON trade_execution_links(trade_execution_id);
CREATE UNIQUE INDEX IF NOT EXISTS links_unique ON trade_execution_links(journal_trade_id, trade_execution_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DISCIPLINE ENGINE: PLANS, CHECKLISTS, RATINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_templates (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  items      JSONB        NOT NULL DEFAULT '[]',
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ct_user_id_idx ON checklist_templates(user_id);

CREATE TABLE IF NOT EXISTS trade_checklists (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journal_trade_id  UUID        NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,
  template_id       UUID        REFERENCES checklist_templates(id) ON DELETE SET NULL,
  items             JSONB       NOT NULL DEFAULT '[]',
  completed_count   INTEGER     NOT NULL DEFAULT 0,
  total_count       INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tch_user_id_idx       ON trade_checklists(user_id);
CREATE INDEX IF NOT EXISTS tch_journal_trade_idx ON trade_checklists(journal_trade_id);

CREATE TABLE IF NOT EXISTS trade_plans (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journal_trade_id  UUID             NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,
  entry_price       DOUBLE PRECISION,
  stop_loss         DOUBLE PRECISION,
  target_price_1    DOUBLE PRECISION,
  target_price_2    DOUBLE PRECISION,
  target_price_3    DOUBLE PRECISION,
  risk_reward_ratio DOUBLE PRECISION,
  planned_quantity  INTEGER,
  rationale         TEXT,
  setup_type        VARCHAR(100),
  was_followed      BOOLEAN,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tp_user_id_idx       ON trade_plans(user_id);
CREATE INDEX IF NOT EXISTS tp_journal_trade_idx ON trade_plans(journal_trade_id);

CREATE TABLE IF NOT EXISTS trade_ratings (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journal_trade_id  UUID             NOT NULL REFERENCES journal_trades(id) ON DELETE CASCADE,
  execution_rating  DOUBLE PRECISION,
  plan_rating       DOUBLE PRECISION,
  psychology_rating DOUBLE PRECISION,
  overall_rating    DOUBLE PRECISION,
  notes             TEXT,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tr_user_id_idx       ON trade_ratings(user_id);
CREATE INDEX IF NOT EXISTS tr_journal_trade_idx ON trade_ratings(journal_trade_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. PRE-MARKET PLANS & RISK PROFILES (BEHAVIORAL SHIELD)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_premarket_plans (
  id                 UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS premarket_user_date_idx ON daily_premarket_plans(user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS premarket_user_date_unique ON daily_premarket_plans(user_id, date);

CREATE TABLE IF NOT EXISTS risk_profiles (
  id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID             NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  max_daily_loss_pct    DOUBLE PRECISION NOT NULL DEFAULT 2,
  max_weekly_loss_pct   DOUBLE PRECISION NOT NULL DEFAULT 5,
  max_monthly_loss_pct  DOUBLE PRECISION NOT NULL DEFAULT 10,
  max_position_size_pct DOUBLE PRECISION NOT NULL DEFAULT 5,
  max_daily_trades      INTEGER          NOT NULL DEFAULT 10,
  kill_switch_enabled   BOOLEAN          NOT NULL DEFAULT TRUE,
  kill_switch_triggered BOOLEAN          NOT NULL DEFAULT FALSE,
  kill_switch_reason    TEXT,
  kill_switch_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rp_user_id_idx ON risk_profiles(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. USER GOALS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_goals (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  type           VARCHAR(50)  NOT NULL,
  target_value   VARCHAR(50)  NOT NULL,
  current_value  VARCHAR(50)  NOT NULL DEFAULT '0',
  progress_pct   VARCHAR(20)  NOT NULL DEFAULT '0',
  period         VARCHAR(30)  NOT NULL DEFAULT 'MONTHLY',
  period_start   TIMESTAMPTZ  NOT NULL,
  period_end     TIMESTAMPTZ  NOT NULL,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  is_completed   BOOLEAN      NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  emoji          VARCHAR(10)  NOT NULL DEFAULT '🎯',
  color          VARCHAR(30)  NOT NULL DEFAULT 'blue',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ug_user_id_idx ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS ug_active_idx  ON user_goals(is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. LEADERBOARD (Opt-in & Snapshots)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard_opt_ins (
  user_id      UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_public    BOOLEAN      NOT NULL DEFAULT FALSE,
  display_name VARCHAR(50)  NOT NULL,
  bio          VARCHAR(280),
  twitter_url  VARCHAR(200),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS leaderboard_public_idx ON leaderboard_opt_ins(is_public);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS lboard_period_rank_idx ON leaderboard_snapshots(period, rank);
CREATE UNIQUE INDEX IF NOT EXISTS lboard_user_period_idx ON leaderboard_snapshots(user_id, period);
CREATE INDEX IF NOT EXISTS lboard_computed_at_idx ON leaderboard_snapshots(computed_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SUBSCRIPTIONS, PLANS & INVOICES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL UNIQUE,
  slug                  VARCHAR(100) NOT NULL UNIQUE,
  description           TEXT,
  price_monthly_paise   BIGINT       NOT NULL DEFAULT 0,
  price_yearly_paise    BIGINT       NOT NULL DEFAULT 0,
  features              JSONB        NOT NULL DEFAULT '{}',
  max_brokers           INTEGER      NOT NULL DEFAULT 1,
  max_trades_per_month  INTEGER      NOT NULL DEFAULT 100,
  has_ai_features       BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order            INTEGER      NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sp_active_idx ON subscription_plans(is_active);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id              UUID         NOT NULL REFERENCES subscription_plans(id),
  status               VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
  provider             VARCHAR(30)  NOT NULL DEFAULT 'RAZORPAY',
  provider_sub_id      VARCHAR(255),
  current_period_start TIMESTAMPTZ  NOT NULL,
  current_period_end   TIMESTAMPTZ  NOT NULL,
  cancel_at_period_end BOOLEAN      NOT NULL DEFAULT FALSE,
  cancelled_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sub_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS sub_status_idx  ON subscriptions(status);

CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id     UUID         REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider            VARCHAR(30)  NOT NULL DEFAULT 'RAZORPAY',
  provider_invoice_id VARCHAR(255),
  provider_order_id   VARCHAR(255),
  provider_payment_id VARCHAR(255),
  amount_paise        BIGINT       NOT NULL,
  currency            VARCHAR(10)  NOT NULL DEFAULT 'INR', -- 'INR' or 'USD'
  status              VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
  paid_at             TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  refund_amount_paise BIGINT,
  description         TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS inv_user_id_idx ON invoices(user_id);
CREATE INDEX IF NOT EXISTS inv_status_idx  ON invoices(status);
CREATE INDEX IF NOT EXISTS inv_paid_at_idx ON invoices(paid_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. DIGITAL PRODUCTS STORE & PURCHASES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(200) NOT NULL,
  description       TEXT         NOT NULL,
  long_description  TEXT,
  product_type      VARCHAR(20)  NOT NULL DEFAULT 'PDF',
  price             INTEGER      NOT NULL DEFAULT 0,
  currency          VARCHAR(10)  NOT NULL DEFAULT 'INR', -- 'INR' or 'USD'
  download_url      TEXT,
  video_url         TEXT,
  preview_image_url TEXT,
  tags              JSONB        NOT NULL DEFAULT '[]',
  author_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name       VARCHAR(100) NOT NULL,
  author_avatar_url TEXT,
  is_published      BOOLEAN      NOT NULL DEFAULT FALSE,
  total_sales       INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_published_idx ON products(is_published);
CREATE INDEX IF NOT EXISTS products_type_idx      ON products(product_type);
CREATE INDEX IF NOT EXISTS products_author_idx    ON products(author_id);

CREATE TABLE IF NOT EXISTS product_orders (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id          UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  amount              INTEGER      NOT NULL,
  currency            VARCHAR(10)  NOT NULL DEFAULT 'INR', -- 'INR' or 'USD'
  status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  razorpay_order_id   VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_user_id_idx   ON product_orders(user_id);
CREATE INDEX IF NOT EXISTS orders_product_idx   ON product_orders(product_id);
CREATE INDEX IF NOT EXISTS orders_rp_order_idx  ON product_orders(razorpay_order_id);

CREATE TABLE IF NOT EXISTS product_access (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id    UUID        NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS access_user_product_unique ON product_access(user_id, product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. REVIEWS & TESTIMONIALS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id    UUID         REFERENCES products(id) ON DELETE SET NULL,
  reviewer_name VARCHAR(255) NOT NULL,
  reviewer_role VARCHAR(255),
  rating        INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         VARCHAR(500),
  content       TEXT         NOT NULL,
  avatar_url    VARCHAR(512),
  status        VARCHAR(30)  NOT NULL DEFAULT 'APPROVED',
  is_featured   BOOLEAN      NOT NULL DEFAULT FALSE,
  is_verified   BOOLEAN      NOT NULL DEFAULT TRUE,
  source        VARCHAR(50)  NOT NULL DEFAULT 'PLATFORM',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rev_user_id_idx  ON reviews(user_id);
CREATE INDEX IF NOT EXISTS rev_status_idx   ON reviews(status);
CREATE INDEX IF NOT EXISTS rev_featured_idx ON reviews(is_featured);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. PARTNERS & AFFILIATES DIRECTORY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 VARCHAR(100) NOT NULL UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  tagline              VARCHAR(500),
  description          TEXT,
  logo_url             VARCHAR(512),
  website_url          VARCHAR(512),
  affiliate_url        VARCHAR(512),
  partner_type         VARCHAR(50)  NOT NULL DEFAULT 'BROKER',
  brokerage_model      VARCHAR(50),
  account_opening_link VARCHAR(512),
  perks                JSONB,
  is_featured          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order           INTEGER      NOT NULL DEFAULT 0,
  click_count          INTEGER      NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS partners_slug_idx     ON partners(slug);
CREATE INDEX IF NOT EXISTS partners_active_idx   ON partners(is_active);
CREATE INDEX IF NOT EXISTS partners_featured_idx ON partners(is_featured);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. NOTIFICATIONS & USER ONBOARDING
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50)   NOT NULL,
  channel      VARCHAR(20)   NOT NULL DEFAULT 'email',
  subject      VARCHAR(500),
  body         VARCHAR(10000),
  is_enabled   BOOLEAN       NOT NULL DEFAULT TRUE,
  is_delivered BOOLEAN       NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  metadata     JSONB,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notif_user_id_idx   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_type_idx      ON notifications(type);
CREATE INDEX IF NOT EXISTS notif_delivered_idx ON notifications(is_delivered);

CREATE TABLE IF NOT EXISTS user_onboarding (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_user_id_unique ON user_onboarding(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. ADMIN GOVERNANCE: CONFIGS, TAX RATES, SYNC LOGS, AUDIT LOGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_configs (
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
CREATE UNIQUE INDEX IF NOT EXISTS admin_configs_key_unique ON admin_configs(key);
CREATE INDEX IF NOT EXISTS admin_configs_category_idx ON admin_configs(category);

CREATE TABLE IF NOT EXISTS tax_rates (
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
CREATE INDEX IF NOT EXISTS tax_rates_segment_idx ON tax_rates(segment);
CREATE INDEX IF NOT EXISTS tax_rates_active_idx  ON tax_rates(is_active);

CREATE TABLE IF NOT EXISTS sync_logs (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_connection_id UUID         NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,
  sync_type           VARCHAR(20)   NOT NULL,
  status              VARCHAR(20)   NOT NULL DEFAULT 'RUNNING',
  started_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  executions_imported INTEGER       NOT NULL DEFAULT 0,
  trades_created      INTEGER       NOT NULL DEFAULT 0,
  trades_updated      INTEGER       NOT NULL DEFAULT 0,
  error_message       VARCHAR(2000),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sync_logs_connection_idx ON sync_logs(broker_connection_id);
CREATE INDEX IF NOT EXISTS sync_logs_user_id_idx    ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS sync_logs_status_idx     ON sync_logs(status);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID         REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id   VARCHAR(255),
  metadata    JSONB,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx  ON admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON admin_audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. SYSTEM & CACHE: AI CACHE, GENERAL CACHE, RATE LIMITS, JOBS, FLAGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_cache (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key         VARCHAR(512) NOT NULL UNIQUE,
  response          TEXT         NOT NULL,
  model             VARCHAR(100),
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  expires_at        TIMESTAMPTZ  NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aic_key_idx        ON ai_cache(cache_key);
CREATE INDEX IF NOT EXISTS aic_expires_at_idx ON ai_cache(expires_at);

CREATE TABLE IF NOT EXISTS cache_entries (
  cache_key  VARCHAR(512) PRIMARY KEY,
  value      TEXT         NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ce_expires_at_idx ON cache_entries(expires_at);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   VARCHAR(255) NOT NULL,
  endpoint     VARCHAR(255) NOT NULL,
  count        INTEGER      NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS arl_identifier_idx ON api_rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS arl_window_idx     ON api_rate_limits(window_start);

CREATE TABLE IF NOT EXISTS background_jobs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type     VARCHAR(100) NOT NULL,
  payload      JSONB        NOT NULL DEFAULT '{}',
  status       VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
  priority     INTEGER      NOT NULL DEFAULT 5,
  attempts     INTEGER      NOT NULL DEFAULT 0,
  max_attempts INTEGER      NOT NULL DEFAULT 3,
  run_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at    TIMESTAMPTZ,
  error        TEXT,
  result       JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bj_status_idx   ON background_jobs(status);
CREATE INDEX IF NOT EXISTS bj_run_at_idx   ON background_jobs(run_at);
CREATE INDEX IF NOT EXISTS bj_job_type_idx ON background_jobs(job_type);

CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(255) NOT NULL UNIQUE,
  is_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
  description TEXT,
  rollout_pct INTEGER      NOT NULL DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  updated_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ff_key_idx ON feature_flags(key);

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users', 'broker_connections', 'broker_profiles', 'trading_strategies',
    'setup_playbooks', 'journal_trades', 'checklist_templates', 'trade_checklists',
    'trade_plans', 'trade_ratings', 'daily_premarket_plans', 'risk_profiles',
    'user_goals', 'leaderboard_opt_ins', 'subscription_plans', 'subscriptions',
    'invoices', 'products', 'product_orders', 'reviews', 'partners',
    'user_onboarding', 'admin_configs', 'tax_rates', 'background_jobs', 'feature_flags'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I;', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all user data tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_execution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_premarket_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_opt_ins ENABLE ROW LEVEL SECURITY;

-- Publicly readable reference tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Auth Trigger: auto-provisions user profile, onboarding, and risk profile on Supabase auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Create public.users record
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    'USER',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create user_onboarding record
  INSERT INTO public.user_onboarding (user_id, created_at, updated_at)
  VALUES (NEW.id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Create default risk_profiles record (₹10,000 daily loss limit, 10 max trades, 3 consecutive losses)
  INSERT INTO public.risk_profiles (
    user_id,
    daily_loss_limit_abs,
    daily_loss_limit_pct,
    max_trades_per_day,
    max_consecutive_losses,
    kill_switch_enabled,
    kill_switch_reset_mode,
    notify_at_75_pct,
    notify_on_kill_switch,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    10000.00,
    3.00,
    10,
    3,
    true,
    'midnight',
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_update_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- User isolation policies:
DO $$
BEGIN
  DROP POLICY IF EXISTS users_self_policy ON users;
  CREATE POLICY users_self_policy ON users FOR ALL USING (auth.uid() = id);
END;
$$;

CREATE POLICY bc_user_policy ON broker_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY bp_user_policy ON broker_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ab_user_policy ON account_balances FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ph_user_policy ON portfolio_holdings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY pos_user_policy ON positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ts_user_policy ON trading_strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY pb_user_policy ON setup_playbooks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY jt_user_policy ON journal_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY te_user_policy ON trade_executions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ct_user_policy ON checklist_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tch_user_policy ON trade_checklists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tp_user_policy ON trade_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tr_user_policy ON trade_ratings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY dpp_user_policy ON daily_premarket_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY rp_user_policy ON risk_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ug_user_policy ON user_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY uo_user_policy ON user_onboarding FOR ALL USING (auth.uid() = user_id);
CREATE POLICY notif_user_policy ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY sub_user_policy ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY inv_user_policy ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY po_user_policy ON product_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY pa_user_policy ON product_access FOR ALL USING (auth.uid() = user_id);
CREATE POLICY loi_user_policy ON leaderboard_opt_ins FOR ALL USING (auth.uid() = user_id);

-- Public read policies
CREATE POLICY sp_public_read ON subscription_plans FOR SELECT USING (true);
CREATE POLICY prod_public_read ON products FOR SELECT USING (is_published = true);
CREATE POLICY rev_public_read ON reviews FOR SELECT USING (status = 'APPROVED');
CREATE POLICY part_public_read ON partners FOR SELECT USING (is_active = true);
CREATE POLICY tax_public_read ON tax_rates FOR SELECT USING (is_active = true);
CREATE POLICY lboard_public_read ON leaderboard_snapshots FOR SELECT USING (true);

-- Admin full-access policies (allows ADMIN role to manage all tables)
DO $$
DECLARE
  pol_tbl text;
BEGIN
  FOR pol_tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all_%I ON public.%I', pol_tbl, pol_tbl);
    EXECUTE format('CREATE POLICY admin_all_%I ON public.%I FOR ALL USING (public.is_admin())', pol_tbl, pol_tbl);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DEFAULTS: SUBSCRIPTION PLANS & TAX RATES
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO subscription_plans (name, slug, description, price_monthly_paise, price_yearly_paise, features, max_brokers, max_trades_per_month, has_ai_features, sort_order)
VALUES 
  ('Starter', 'starter', 'Essential journaling for retail traders. 1 broker, 50 trades/month.', 0, 0, '{"journal": true, "analytics_basic": true, "ai": false}', 1, 50, FALSE, 0),
  ('Pro', 'pro', 'Institutional-grade trade analytics, AI copilot, unlimited trades, and 5 brokers.', 49900, 399900, '{"journal": true, "analytics_advanced": true, "ai": true, "brokers": 5, "replay": true, "leaderboard": true}', 5, -1, TRUE, 1),
  ('Elite', 'elite', 'Full behavioral psychology suite, unlimited brokers, institutional chart replays & API access.', 99900, 799900, '{"journal": true, "analytics_advanced": true, "ai": true, "brokers": 99, "replay": true, "priority_support": true}', 99, -1, TRUE, 2)
ON CONFLICT (slug) DO NOTHING;

-- Seed Indian STT & Turnover tax rates
INSERT INTO tax_rates (name, segment, transaction_type, rate_type, rate_value, applied_on, is_active, priority)
VALUES
  ('STT - Equity Delivery', 'EQUITY', 'BOTH', 'percentage', 0.1, 'turnover', TRUE, 1),
  ('STT - Equity Intraday', 'EQUITY', 'SELL', 'percentage', 0.025, 'turnover', TRUE, 2),
  ('STT - F&O Futures', 'FNO', 'SELL', 'percentage', 0.02, 'turnover', TRUE, 3),
  ('STT - F&O Options (Premium)', 'FNO', 'SELL', 'percentage', 0.1, 'turnover', TRUE, 4),
  ('GST on Brokerage & Charges', 'ALL', 'BOTH', 'percentage', 18.0, 'charges', TRUE, 5),
  ('SEBI Turnover Charges', 'ALL', 'BOTH', 'percentage', 0.0001, 'turnover', TRUE, 6)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MASTER SCHEMA (39 TABLES + RLS + TRIGGERS + SEEDS)
-- ═══════════════════════════════════════════════════════════════════════════
