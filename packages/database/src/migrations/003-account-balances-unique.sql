-- TradeMind — Migration: one current balance snapshot per broker connection

CREATE UNIQUE INDEX IF NOT EXISTS account_balances_connection_unique
  ON account_balances (broker_connection_id);
