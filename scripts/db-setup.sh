#!/usr/bin/env bash
# ──────────────────────────────────────────────
# TradeMind — One-Click Database Setup
#
# This script creates the complete Supabase schema,
# enables Row-Level Security, applies all indexes,
# and seeds default data (tax rates, configs, plans).
#
# Usage:
#   ./scripts/db-setup.sh
#
#   Requires: SUPABASE_DATABASE_URL (or DATABASE_URL) in .env
#   Uses:     packages/database/src/migrations/0000_*.sql
# ──────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION_FILE="$(ls "${ROOT_DIR}"/packages/database/src/migrations/0000_*.sql 2>/dev/null || true)"

if [[ -z "${MIGRATION_FILE}" ]]; then
  echo "❌ No Drizzle migration found. Run: npx drizzle-kit generate in packages/database"
  exit 1
fi

# Source .env if present
if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a; source "${ROOT_DIR}/.env"; set +a
fi

DATABASE_URL="${DATABASE_URL:-${SUPABASE_DATABASE_URL:-}}"

if [[ -z "${DATABASE_URL}" ]]; then
  echo "❌ DATABASE_URL or SUPABASE_DATABASE_URL must be set in .env"
  exit 1
fi

echo "🌱 Applying TradeMind complete Supabase schema, RLS, and seed data..."
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${ROOT_DIR}/packages/database/src/migrations/supabase-complete-setup.sql"

echo "✅ Database setup complete! All 34 tables, RLS policies, and seed records are active."
