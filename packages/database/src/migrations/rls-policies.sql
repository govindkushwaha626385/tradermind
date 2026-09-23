-- ────────────────────────────────────────────────────────────────
-- TradeMind — Supabase Row-Level Security (RLS) Policies
--
-- These policies ensure multi-tenant data isolation:
-- each user can ONLY access their own data.
--
-- Run this SQL in the Supabase SQL Editor after pushing the schema.
-- ────────────────────────────────────────────────────────────────

-- ── Helper: enable RLS on all tables ────────────────────────────
-- (This is done table by table below)

-- ── users ───────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'ADMIN'
    )
  );
  -- Note: This allows admins to bypass the user-level filter.
  -- The OR condition is handled by Supabase: if ANY policy allows access, access is granted.

-- ── broker_connections ─────────────────────────────────────────
ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own broker connections"
  ON broker_connections FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own broker connections"
  ON broker_connections FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own broker connections"
  ON broker_connections FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own broker connections"
  ON broker_connections FOR DELETE
  USING (auth.uid()::text = user_id);

-- ── broker_profiles ────────────────────────────────────────────
ALTER TABLE broker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own broker profiles"
  ON broker_profiles FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own broker profiles"
  ON broker_profiles FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- ── account_balances ────────────────────────────────────────────
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account balances"
  ON account_balances FOR SELECT
  USING (auth.uid()::text = user_id);

-- ── portfolio_holdings ──────────────────────────────────────────
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holdings"
  ON portfolio_holdings FOR SELECT
  USING (auth.uid()::text = user_id);

-- ── positions ───────────────────────────────────────────────────
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  USING (auth.uid()::text = user_id);

-- ── trade_executions ────────────────────────────────────────────
ALTER TABLE trade_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions"
  ON trade_executions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert executions"
  ON trade_executions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- ── journal_trades ──────────────────────────────────────────────
ALTER TABLE journal_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal trades"
  ON journal_trades FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own journal trades"
  ON journal_trades FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own journal trades"
  ON journal_trades FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ── trade_execution_links ───────────────────────────────────────
ALTER TABLE trade_execution_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own execution links"
  ON trade_execution_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM journal_trades
      WHERE journal_trades.id = trade_execution_links.journal_trade_id
      AND journal_trades.user_id::text = auth.uid()::text
    )
  );

-- ── setup_playbooks ─────────────────────────────────────────────
ALTER TABLE setup_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playbooks"
  ON setup_playbooks FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own playbooks"
  ON setup_playbooks FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own playbooks"
  ON setup_playbooks FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own playbooks"
  ON setup_playbooks FOR DELETE
  USING (auth.uid()::text = user_id);

-- ── subscriptions ───────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid()::text = user_id);

-- ── invoices ────────────────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid()::text = user_id);

-- ── notifications ───────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own notification prefs"
  ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ── user_onboarding ─────────────────────────────────────────────
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
  ON user_onboarding FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can upsert own onboarding"
  ON user_onboarding FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own onboarding"
  ON user_onboarding FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ── sync_logs ───────────────────────────────────────────────────
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON sync_logs FOR SELECT
  USING (auth.uid()::text = user_id);

-- ── admin_configs (admins only) ──────────────────────────────────
ALTER TABLE admin_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read configs"
  ON admin_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'ADMIN'
    )
    OR is_public = true
  );

CREATE POLICY "Admins can write configs"
  ON admin_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update configs"
  ON admin_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'ADMIN'
    )
  );

-- ── tax_rates (admins only) ─────────────────────────────────────
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tax rates"
  ON tax_rates FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
  ));

CREATE POLICY "Admins can write tax rates"
  ON tax_rates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update tax rates"
  ON tax_rates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete tax rates"
  ON tax_rates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
    )
  );

-- ── plans (read by all, write by admins) ────────────────────────
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON plans FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
  ));

CREATE POLICY "Admins can write plans"
  ON plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update plans"
  ON plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
    )
  );

-- ── checklist_templates ─────────────────────────────────────────
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklist templates"
  ON checklist_templates FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own checklist templates"
  ON checklist_templates FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own checklist templates"
  ON checklist_templates FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own checklist templates"
  ON checklist_templates FOR DELETE
  USING (auth.uid()::text = user_id);

-- ── trade_checklists ────────────────────────────────────────────
ALTER TABLE trade_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trade checklists"
  ON trade_checklists FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own trade checklists"
  ON trade_checklists FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own trade checklists"
  ON trade_checklists FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ── trade_plans ─────────────────────────────────────────────────
ALTER TABLE trade_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trade plans"
  ON trade_plans FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own trade plans"
  ON trade_plans FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own trade plans"
  ON trade_plans FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ── trade_ratings ───────────────────────────────────────────────
ALTER TABLE trade_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trade ratings"
  ON trade_ratings FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own trade ratings"
  ON trade_ratings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own trade ratings"
  ON trade_ratings FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ── Missing INSERT/UPDATE/DELETE policies ────────────────────

-- users: admins can insert/delete (system-level)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'ADMIN')
  );

-- broker_profiles: users can update/delete own
CREATE POLICY "Users can update own broker profiles"
  ON broker_profiles FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own broker profiles"
  ON broker_profiles FOR DELETE
  USING (auth.uid()::text = user_id);

-- account_balances: system inserts/updates, users view only
CREATE POLICY "System can insert account balances"
  ON account_balances FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "System can update account balances"
  ON account_balances FOR UPDATE
  USING (auth.uid()::text = user_id);

-- portfolio_holdings: system inserts/updates
CREATE POLICY "System can insert holdings"
  ON portfolio_holdings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "System can update holdings"
  ON portfolio_holdings FOR UPDATE
  USING (auth.uid()::text = user_id);

-- positions: system inserts/updates
CREATE POLICY "System can insert positions"
  ON positions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "System can update positions"
  ON positions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- trade_executions: system updates (e.g. marking linked)
CREATE POLICY "System can update executions"
  ON trade_executions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- journal_trades: users can delete own
CREATE POLICY "Users can delete own journal trades"
  ON journal_trades FOR DELETE
  USING (auth.uid()::text = user_id);

-- trade_execution_links: system inserts/updates/deletes
CREATE POLICY "System can insert execution links"
  ON trade_execution_links FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM journal_trades WHERE id = trade_execution_links.journal_trade_id AND user_id::text = auth.uid()::text)
  );

CREATE POLICY "System can update execution links"
  ON trade_execution_links FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM journal_trades WHERE id = trade_execution_links.journal_trade_id AND user_id::text = auth.uid()::text)
  );

CREATE POLICY "System can delete execution links"
  ON trade_execution_links FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM journal_trades WHERE id = trade_execution_links.journal_trade_id AND user_id::text = auth.uid()::text)
  );

-- subscriptions: system inserts/updates/deletes (payment service)
CREATE POLICY "System can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "System can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- invoices: system inserts
CREATE POLICY "System can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- notifications: system inserts (for audit log), users can delete
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid()::text = user_id);

-- user_onboarding: users can delete own
CREATE POLICY "Users can delete own onboarding"
  ON user_onboarding FOR DELETE
  USING (auth.uid()::text = user_id);

-- sync_logs: system inserts/updates, users view own
CREATE POLICY "System can insert sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "System can update sync logs"
  ON sync_logs FOR UPDATE
  USING (auth.uid()::text = user_id);

-- admin_configs: admins can delete
CREATE POLICY "Admins can delete configs"
  ON admin_configs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'ADMIN')
  );

-- plans: admins can delete
CREATE POLICY "Admins can delete plans"
  ON plans FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'ADMIN')
  );

-- trade_checklists: users can delete own
CREATE POLICY "Users can delete own trade checklists"
  ON trade_checklists FOR DELETE
  USING (auth.uid()::text = user_id);

-- trade_plans: users can delete own
CREATE POLICY "Users can delete own trade plans"
  ON trade_plans FOR DELETE
  USING (auth.uid()::text = user_id);

-- trade_ratings: users can delete own
CREATE POLICY "Users can delete own trade ratings"
  ON trade_ratings FOR DELETE
  USING (auth.uid()::text = user_id);
