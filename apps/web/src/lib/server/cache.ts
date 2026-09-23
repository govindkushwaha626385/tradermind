// ──────────────────────────────────────────────
// TradeMind — Server: Cache Helper
//
// Ported from apps/api/src/lib/cache.ts.
// Two-layer cache: L1 in-process memory (60s) +
// L2 Supabase `cache_entries` table (configurable TTL).
// ──────────────────────────────────────────────

import { getDatabase, cacheEntries } from '@trademind/database';
import { eq, lt, like, sql } from 'drizzle-orm';

// ── L1 in-process memory cache (per instance, 60s TTL) ──────────

interface L1Entry {
  value: unknown;
  expiresAt: number; // ms timestamp
}

const l1Cache = new Map<string, L1Entry>();

function l1Get<T>(key: string): T | null {
  const entry = l1Cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    l1Cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function l1Set(key: string, value: unknown, ttlSeconds: number): void {
  l1Cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function l1Delete(key: string): void {
  l1Cache.delete(key);
}

function l1DeletePattern(pattern: string): void {
  const prefix = pattern.replace(/\*.*$/, '');
  for (const key of l1Cache.keys()) {
    if (key.startsWith(prefix)) l1Cache.delete(key);
  }
}

// ── L2 Supabase table helpers ──────────────────────────────────

async function dbGet<T>(key: string): Promise<T | null> {
  try {
    const db = getDatabase();
    const [row] = await db.select().from(cacheEntries).where(eq(cacheEntries.key, key)).limit(1);
    if (!row) return null;
    if (new Date(row.expiresAt) < new Date()) {
      db.delete(cacheEntries).where(eq(cacheEntries.key, key)).catch(() => {});
      return null;
    }
    return row.value as T;
  } catch {
    return null;
  }
}

async function dbSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const db = getDatabase();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await db
      .insert(cacheEntries)
      .values({ key, value: value as any, expiresAt })
      .onConflictDoUpdate({ target: cacheEntries.key, set: { value: value as any, expiresAt } });
  } catch (err) {
    console.warn(`[Cache] Failed to persist key "${key}":`, err);
  }
}

async function dbDeletePattern(pattern: string): Promise<void> {
  try {
    const db = getDatabase();
    const sqlPattern = pattern.replace(/\*/g, '%');
    await db.delete(cacheEntries).where(like(cacheEntries.key, sqlPattern));
  } catch (err) {
    console.warn(`[Cache] Failed to invalidate pattern "${pattern}":`, err);
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Get or set a cached value.
 * Checks L1 (in-memory) first, then L2 (DB table).
 * Falls back to fetchFn() on cache miss or DB errors.
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 300,
): Promise<T> {
  const l1 = l1Get<T>(key);
  if (l1 !== null) return l1;

  const l2 = await dbGet<T>(key);
  if (l2 !== null) {
    l1Set(key, l2, Math.min(ttlSeconds, 60));
    return l2;
  }

  try {
    const value = await fetchFn();
    l1Set(key, value, Math.min(ttlSeconds, 60));
    await dbSet(key, value, ttlSeconds);
    return value;
  } catch (err) {
    console.warn(`[Cache] Fetch failed for "${key}":`, err);
    return fetchFn();
  }
}

/**
 * Invalidate cache keys by glob pattern (e.g. "user:*:profile").
 * Clears both L1 and L2.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  l1DeletePattern(pattern);
  await dbDeletePattern(pattern);
}

/**
 * Delete a single cache key from both layers.
 */
export async function deleteCache(key: string): Promise<void> {
  l1Delete(key);
  try {
    const db = getDatabase();
    await db.delete(cacheEntries).where(eq(cacheEntries.key, key));
  } catch (err) {
    console.warn(`[Cache] Failed to delete key "${key}":`, err);
  }
}

/**
 * Purge all expired entries from the cache_entries table.
 * Called from the cleanup background job.
 */
export async function purgeExpiredCache(): Promise<number> {
  try {
    const db = getDatabase();
    const result = await db.delete(cacheEntries).where(lt(cacheEntries.expiresAt, sql`NOW()`));
    return (result as any).count ?? 0;
  } catch (err) {
    console.warn('[Cache] Failed to purge expired entries:', err);
    return 0;
  }
}
