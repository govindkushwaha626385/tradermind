-- ──────────────────────────────────────────────
-- Migration 008: Trading Strategies & Leaderboard
-- ──────────────────────────────────────────────

-- 1. Trading Strategies table
CREATE TABLE IF NOT EXISTS public.trading_strategies (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                varchar(100) NOT NULL,
  description         text,
  market_type         varchar(20)  NOT NULL DEFAULT 'EQUITY',
  timeframe           varchar(20),
  entry_criteria      text,
  exit_criteria       text,
  risk_rules          jsonb,
  tags                text[],
  win_count           integer      NOT NULL DEFAULT 0,
  loss_count          integer      NOT NULL DEFAULT 0,
  total_trades        integer      NOT NULL DEFAULT 0,
  total_pnl           double precision NOT NULL DEFAULT 0,
  avg_r_multiple      double precision,
  is_active           boolean      NOT NULL DEFAULT true,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategies_user_id_idx ON public.trading_strategies (user_id);
CREATE INDEX IF NOT EXISTS strategies_active_idx ON public.trading_strategies (user_id, is_active);
CREATE INDEX IF NOT EXISTS strategies_market_type_idx ON public.trading_strategies (market_type);

-- 2. Add strategy_id to journal_trades
ALTER TABLE public.journal_trades
  ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.trading_strategies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS journal_trades_strategy_idx ON public.journal_trades (strategy_id);

-- 3. Leaderboard Opt-Ins table
CREATE TABLE IF NOT EXISTS public.leaderboard_opt_ins (
  user_id             uuid         PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  is_public           boolean      NOT NULL DEFAULT false,
  display_name        varchar(50)  NOT NULL,
  bio                 varchar(280),
  twitter_url         varchar(200),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_opt_ins_public_idx ON public.leaderboard_opt_ins (is_public);

-- 4. Leaderboard Snapshots table
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period              varchar(20)  NOT NULL, -- WEEKLY | MONTHLY | ALL_TIME
  rank                integer      NOT NULL,
  display_name        varchar(50)  NOT NULL,
  avatar_url          varchar(512),
  bio                 varchar(280),
  twitter_url         varchar(200),
  total_pnl           double precision NOT NULL DEFAULT 0,
  pnl_percent         double precision NOT NULL DEFAULT 0,
  win_rate            double precision NOT NULL DEFAULT 0,
  total_trades        integer      NOT NULL DEFAULT 0,
  discipline_score    double precision NOT NULL DEFAULT 0,
  composite_score     double precision NOT NULL DEFAULT 0,
  computed_at         timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT leaderboard_snapshots_user_period_uniq UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS leaderboard_snapshots_period_rank_idx ON public.leaderboard_snapshots (period, rank);
CREATE INDEX IF NOT EXISTS leaderboard_snapshots_computed_at_idx ON public.leaderboard_snapshots (computed_at);

-- 5. Row-Level Security Policies
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Trading Strategies RLS: Users can only manage their own strategies
CREATE POLICY "Users can select own strategies"
  ON public.trading_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON public.trading_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON public.trading_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON public.trading_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- Leaderboard Opt-Ins RLS: Users manage their own opt-in; public can view if public
CREATE POLICY "Anyone can view public opt-ins"
  ON public.leaderboard_opt_ins FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can upsert own opt-in"
  ON public.leaderboard_opt_ins FOR ALL
  USING (auth.uid() = user_id);

-- Leaderboard Snapshots RLS: Public read for everyone, write restricted to service role
CREATE POLICY "Public read for leaderboard snapshots"
  ON public.leaderboard_snapshots FOR SELECT
  USING (true);
