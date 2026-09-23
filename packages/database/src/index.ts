// ──────────────────────────────────────────────
// TradeMind — Database Package Entry Point
// ──────────────────────────────────────────────

export { getDatabase, getSupabaseClient, getSupabaseAdmin } from './client';
export type { Database, SupabaseClient } from './client';
export * from './schema';
export {
  encrypt,
  decrypt,
  sha256,
  createFillHash,
  generateSecureToken,
  maskSensitive,
  createHmac,
} from './lib/encryption';
