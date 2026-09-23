-- ──────────────────────────────────────────────
-- TradeMind — pg_cron Scheduled Jobs
--
-- Run this SQL in the Supabase SQL Editor (or via
-- a migration) after enabling the pg_cron extension.
--
-- Prerequisites:
--   1. Enable pg_cron in Supabase Dashboard → Database → Extensions
--   2. Enable pg_net in Supabase Dashboard → Database → Extensions
--   3. Set INTERNAL_WORKER_SECRET in your Supabase project
--      secrets (Dashboard → Edge Functions → Secrets)
--
-- Replace <PROJECT_REF> with your Supabase project ref.
-- Replace <INTERNAL_WORKER_SECRET> with your secret value.
-- ──────────────────────────────────────────────

-- Enable required extensions (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Kill Switch: every 5 minutes ─────────────────────────────────
SELECT cron.schedule(
  'trademind-kill-switch',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://djsohdhjxpbhknxlkxlm.supabase.co/functions/v1/kill-switch',
    headers := '{"Authorization": "Bearer 12caced2540a285cbc624bc38c5fd8aa77bd876a027567b23599dd2c407fb63d", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── Token Refresh: every 15 minutes ──────────────────────────────
SELECT cron.schedule(
  'trademind-token-refresh',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://djsohdhjxpbhknxlkxlm.supabase.co/functions/v1/token-refresh',
    headers := '{"Authorization": "Bearer 12caced2540a285cbc624bc38c5fd8aa77bd876a027567b23599dd2c407fb63d", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── Daily Report: 6:00 PM IST (12:30 UTC) ────────────────────────
SELECT cron.schedule(
  'trademind-daily-report',
  '30 12 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://djsohdhjxpbhknxlkxlm.supabase.co/functions/v1/report-generator',
    headers := '{"Authorization": "Bearer 12caced2540a285cbc624bc38c5fd8aa77bd876a027567b23599dd2c407fb63d", "Content-Type": "application/json"}'::jsonb,
    body    := '{"type": "daily"}'::jsonb
  );
  $$
);

-- ── Weekly Report: Sunday 6:00 PM IST (12:30 UTC) ────────────────
SELECT cron.schedule(
  'trademind-weekly-report',
  '30 12 * * 0',
  $$
  SELECT net.http_post(
    url     := 'https://djsohdhjxpbhknxlkxlm.supabase.co/functions/v1/report-generator',
    headers := '{"Authorization": "Bearer 12caced2540a285cbc624bc38c5fd8aa77bd876a027567b23599dd2c407fb63d", "Content-Type": "application/json"}'::jsonb,
    body    := '{"type": "weekly"}'::jsonb
  );
  $$
);

-- ── Cleanup: daily at 02:00 UTC ──────────────────────────────────
SELECT cron.schedule(
  'trademind-cleanup',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://djsohdhjxpbhknxlkxlm.supabase.co/functions/v1/cleanup',
    headers := '{"Authorization": "Bearer 12caced2540a285cbc624bc38c5fd8aa77bd876a027567b23599dd2c407fb63d", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ── View scheduled jobs ──────────────────────────────────────────
-- SELECT * FROM cron.job;

-- ── Remove a job if needed ───────────────────────────────────────
-- SELECT cron.unschedule('trademind-kill-switch');
