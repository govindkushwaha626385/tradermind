# TradeMind Database Migrations

## ⭐️ SINGLE SOURCE OF TRUTH: `MASTER_SCHEMA.sql`

To initialize or update your TradeMind database in Supabase:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** → **New Query**.
3. Copy the entire contents of [`MASTER_SCHEMA.sql`](./MASTER_SCHEMA.sql).
4. Click **Run**.

That's it! 

### What this script sets up (39 Tables, Idempotent, v5.0):
- **Core Entities**: `users`, `broker_connections`, `broker_profiles`, `account_balances`, `portfolio_holdings`, `positions`, `trade_executions`, `journal_trades`, `trade_execution_links`
- **Discipline & Playbooks**: `setup_playbooks`, `checklist_templates`, `trade_checklists`, `trade_plans`, `trade_ratings`, `daily_premarket_plans`, `user_goals`
- **Strategies & Leaderboard**: `trading_strategies`, `leaderboard_opt_ins`, `leaderboard_snapshots`
- **Monetization & Store**: `plans`, `subscriptions`, `invoices`, `products`, `product_orders`, `product_access`, `reviews`, `partners`
- **Risk & Security**: `risk_profiles`, `admin_configs`, `tax_rates`, `sync_logs`, `admin_audit_logs`, `notifications`, `user_onboarding`
- **Infrastructure**:
  - `background_jobs` — Multi-worker task queue with `FOR UPDATE SKIP LOCKED`
  - `cache_entries` — Key-value cache with automated TTL
  - `api_rate_limits` — Atomic rolling-window IP & user rate limiting
  - `feature_flags` — Dynamic feature toggles & rules
  - `ai_cache` — User-isolated AI response caching
- **RLS & Security**: Full Row-Level Security on all 39 tables, public reads for catalogs, user isolation, service role permissions, and full admin override.
- **Triggers**: Auto-provisioning trigger on `auth.users` signup (`users`, `user_onboarding`, `risk_profiles`), plus universal `updated_at` triggers.
- **Seed Data**: 5 Subscription Plans, 9 Tax Rates, 12 Admin Configs, and 6 Top Partners (Zerodha, Dhan, Fyers, Angel One, Upstox, Delta Exchange India).

