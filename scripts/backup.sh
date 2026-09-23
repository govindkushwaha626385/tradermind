#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# TradeMind — Database Backup Script
#
# Creates a pg_dump backup of the Supabase PostgreSQL database.
# Usage:
#   ./scripts/backup.sh                    # backup to ./backups
#   ./scripts/backup.sh /custom/path       # backup to custom path
#
# Requires: SUPABASE_DATABASE_URL in .env
# ────────────────────────────────────────────────────────────────

set -euo pipefail

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

DB_URL="${DATABASE_URL:-${SUPABASE_DATABASE_URL:-}}"
if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL or SUPABASE_DATABASE_URL not set. Add it to .env"
  exit 1
fi

BACKUP_DIR="${1:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/trademind_$TIMESTAMP.sql"

echo "📦 Backing up database to $BACKUP_FILE ..."
pg_dump "$DB_URL" --no-owner --no-privileges > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"
echo "✅ Backup complete: $BACKUP_FILE.gz"

# Keep only last 14 backups
ls -1t "$BACKUP_DIR"/trademind_*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
echo "🧹 Cleaned old backups (kept last 14)"
