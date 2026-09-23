-- ────────────────────────────────────────────────────────────────
-- TradeMind — Migration: Add audit trail to admin_configs
--
-- Adds updated_by column to track which admin made config changes.
-- Run this in the Supabase SQL Editor after pushing the schema.
-- ────────────────────────────────────────────────────────────────

ALTER TABLE admin_configs
  ADD COLUMN IF NOT EXISTS updated_by varchar(255);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS admin_configs_updated_by_idx
  ON admin_configs (updated_by);
