-- TradeMind — Migration: Add persisted user preferences

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_currency varchar(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS timezone varchar(50) NOT NULL DEFAULT 'Asia/Kolkata';
