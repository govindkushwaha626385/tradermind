// ──────────────────────────────────────────────
// TradeMind — Supabase Cache Helper
//
// Key-value cache helper using the `cache_entries`
// Supabase table as the persistence layer with a
// 60-second in-process L1 memory cache to avoid
// redundant DB round-trips.
// ──────────────────────────────────────────────

import { getDatabase } from '@trademind/database';
import { cacheEntries } from '@trademind/database';
import { eq, lt, like, sql } from 'drizzle-orm';

// ── L1 in-process memory cache (per instance, 60s TTL) ──────────────
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
  // Convert glob-style pattern (e.g. "user:*:profile") to a prefix match
  const prefix = pattern.replace(/\*.*$/, '');
  for (const key of l1Cache.keys()) {
    if (key.startsWith(prefix)) {
      l1Cache.delete(key);
    }
  }
}

// ── L2 Supabase table helpers ─────────────────────────────────────────

async function dbGet<T>(key: string): Promise<T | null> {
  try {
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(cacheEntries)
      .where(eq(cacheEntries.key, key))
      .limit(1);

    if (!row) return null;
    // Expired? treat as miss and delete lazily
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
      .onConflictDoUpdate({
        target: cacheEntries.key,
        set: { value: value as any, expiresAt },
      });
  } catch (err) {
    console.warn(`[Cache] Failed to persist key "${key}":`, err);
  }
}

async function dbDeletePattern(pattern: string): Promise<void> {
  try {
    const db = getDatabase();
    // Convert glob (*) pattern to LIKE SQL pattern (%)
    const sqlPattern = pattern.replace(/\*/g, '%');
    await db.delete(cacheEntries).where(like(cacheEntries.key, sqlPattern));
  } catch (err) {
    console.warn(`[Cache] Failed to invalidate pattern "${pattern}":`, err);
  }
}

// ── Exported Public API ───────────────────────────────────────────────

/**
 * Cache helper: get or set cache with TTL.
 * Checks L1 (in-memory) first, then L2 (Supabase table).
 * Falls back to fetchFn() if both miss or DB is unreachable.
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 300,
): Promise<T> {
  // L1 hit
  const l1 = l1Get<T>(key);
  if (l1 !== null) return l1;

  // L2 hit
  const l2 = await dbGet<T>(key);
  if (l2 !== null) {
    // Promote to L1 with short TTL
    l1Set(key, l2, Math.min(ttlSeconds, 60));
    return l2;
  }

  // Miss — fetch from source
  try {
    const value = await fetchFn();
    // Persist to both layers
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
 * Call from the cleanup background job (hourly).
 */
export async function purgeExpiredCache(): Promise<number> {
  try {
    const db = getDatabase();
    const result = await db
      .delete(cacheEntries)
      .where(lt(cacheEntries.expiresAt, sql`NOW()`));
    return (result as any).count ?? 0;
  } catch (err) {
    console.warn('[Cache] Failed to purge expired entries:', err);
    return 0;
  }
}
