-- ──────────────────────────────────────────────
-- Migration 010: Risk Profiles & Kill Switch
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id                              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         uuid          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Daily Loss Limits
  daily_loss_limit_abs            numeric(12,2) DEFAULT 0,  -- absolute ₹ amount
  daily_loss_limit_pct            numeric(5,2)  DEFAULT 0,  -- % of capital

  -- Trade Count Limits
  max_trades_per_day              integer       DEFAULT 0,  -- 0 = unlimited
  max_consecutive_losses          integer       DEFAULT 0,  -- 0 = unlimited

  -- Position Size Limits
  max_position_size_pct           numeric(5,2)  DEFAULT 0,  -- % of capital
  max_open_positions              integer       DEFAULT 0,  -- 0 = unlimited

  -- Kill Switch
  kill_switch_enabled             boolean       NOT NULL DEFAULT false,
  kill_switch_active              boolean       NOT NULL DEFAULT false,
  kill_switch_reset_mode          varchar(20)   NOT NULL DEFAULT 'midnight',  -- 'midnight' | 'manual' | 'admin'
  kill_switch_triggered_at        timestamptz,
  kill_switch_reason              text,

  -- Cooldown
  cooldown_minutes_after_loss     integer       DEFAULT 0,

  -- Notifications
  notify_at_75_pct                boolean       NOT NULL DEFAULT true,
  notify_on_kill_switch           boolean       NOT NULL DEFAULT true,

  -- Meta
  created_at                      timestamptz   NOT NULL DEFAULT now(),
  updated_at                      timestamptz   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS risk_profiles_user_id_idx ON public.risk_profiles (user_id);

-- Row Level Security
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own risk profile
CREATE POLICY IF NOT EXISTS "risk_profiles_owner_all"
  ON public.risk_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for API server)
CREATE POLICY IF NOT EXISTS "risk_profiles_service_all"
  ON public.risk_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update `updated_at` trigger
CREATE OR REPLACE FUNCTION update_risk_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER risk_profiles_updated_at
  BEFORE UPDATE ON public.risk_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_profiles_updated_at();

-- Add `partners` table to supabase-complete-setup reference
-- (this migration also extends the partners table's RLS)
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Partners public read
DROP POLICY IF EXISTS "partners_public_read" ON public.partners;
CREATE POLICY "partners_public_read"
  ON public.partners
  FOR SELECT
  USING (is_active = true);

-- Partners service role full access
DROP POLICY IF EXISTS "partners_service_all" ON public.partners;
CREATE POLICY "partners_service_all"
  ON public.partners
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
