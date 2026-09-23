-- ──────────────────────────────────────────────
-- Migration 006: Daily Pre-Market Plans & RLS
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_premarket_plans (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date                varchar(10)  NOT NULL,
  market_bias         varchar(20)  NOT NULL DEFAULT 'NEUTRAL',
  key_levels          text,
  max_daily_loss      double precision,
  max_daily_trades    integer,
  max_risk_per_trade  double precision,
  checklist_items     jsonb        DEFAULT '[]'::jsonb,
  watchlist           jsonb        DEFAULT '[]'::jsonb,
  mental_state        varchar(50),
  notes               text,
  is_locked           boolean      NOT NULL DEFAULT false,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

-- Constraints & Indexes
CREATE UNIQUE INDEX IF NOT EXISTS dpp_user_date_idx ON public.daily_premarket_plans (user_id, date);
CREATE INDEX IF NOT EXISTS dpp_user_id_idx   ON public.daily_premarket_plans (user_id);
CREATE INDEX IF NOT EXISTS dpp_date_idx      ON public.daily_premarket_plans (date);

-- Row Level Security
ALTER TABLE public.daily_premarket_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_premarket_plans: all own or admin" ON public.daily_premarket_plans;
CREATE POLICY "daily_premarket_plans: all own or admin" ON public.daily_premarket_plans
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());
