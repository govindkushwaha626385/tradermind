// ──────────────────────────────────────────────
// TradeMind — Configuration Loader
// Loads config from DB (admin_configs table) with
// fallback to defaults defined in definitions.ts
// ──────────────────────────────────────────────

import { getDatabase } from '@trademind/database';
import { adminConfigs } from '@trademind/database';
import { eq } from 'drizzle-orm';
import { CONFIG_DEFINITIONS, CONFIG_CATEGORIES } from './definitions';
import type { ConfigDefinition, ConfigValue } from './definitions';

export { CONFIG_DEFINITIONS, CONFIG_CATEGORIES };
export type { ConfigDefinition, ConfigValue };

/**
 * Configuration Manager — loads values from DB with in-memory cache
 */
class ConfigManager {
  private cache: Map<string, ConfigValue> = new Map();
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 60_000; // 1 minute cache

  /**
   * Get a single config value by key
   * Falls back to default if not in DB
   */
  async get<T = ConfigValue>(key: string): Promise<T> {
    await this.refreshCacheIfNeeded();

    const cached = this.cache.get(key);
    if (cached !== undefined) return cached as T;

    // Fallback to default
    const definition = CONFIG_DEFINITIONS.find((d) => d.key === key);
    if (definition) {
      return definition.defaultValue as T;
    }

    throw new Error(`Configuration key "${key}" not found`);
  }

  /**
   * Get all config values, optionally filtered by category
   */
  async getAll(category?: string): Promise<Record<string, ConfigValue>> {
    await this.refreshCacheIfNeeded();

    const entries: Record<string, ConfigValue> = {};
    for (const [key, value] of this.cache.entries()) {
      if (!category) {
        entries[key] = value;
      } else {
        const def = CONFIG_DEFINITIONS.find((d) => d.key === key);
        if (def?.category === category) {
          entries[key] = value;
        }
      }
    }

    // Fill in missing defaults
    for (const def of CONFIG_DEFINITIONS) {
      if (!category || def.category === category) {
        if (!(def.key in entries)) {
          entries[def.key] = def.defaultValue;
        }
      }
    }

    return entries;
  }

  /**
   * Update a config value in the database
   */
  async set(key: string, value: ConfigValue): Promise<void> {
    const db = getDatabase();

    const existing = await db
      .select()
      .from(adminConfigs)
      .where(eq(adminConfigs.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(adminConfigs)
        .set({ value: value as any, updatedBy: 'admin', updatedAt: new Date() })
        .where(eq(adminConfigs.key, key));
    } else {
      const definition = CONFIG_DEFINITIONS.find((d) => d.key === key);
      await db.insert(adminConfigs).values({
        key,
        value: value as any,
        type: definition?.type ?? 'string',
        label: definition?.label ?? key,
        description: definition?.description ?? '',
        category: definition?.category ?? CONFIG_CATEGORIES.GENERAL,
        isPublic: definition?.isPublic ?? false,
        updatedBy: 'admin',
      });
    }

    // Update cache
    this.cache.set(key, value);
  }

  /**
   * Refresh cache from database if TTL has expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.cacheTimestamp < this.cacheTTL) return;

    try {
      const db = getDatabase();
      const rows = await db.select().from(adminConfigs);

      for (const row of rows) {
        this.cache.set(row.key, row.value as ConfigValue);
      }

      this.cacheTimestamp = now;
    } catch {
      // If DB is not available, use defaults
      // This allows the app to start without a DB connection
    }
  }

  /**
   * Force refresh cache
   */
  async refresh(): Promise<void> {
    this.cacheTimestamp = 0;
    await this.refreshCacheIfNeeded();
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
    this.cacheTimestamp = 0;
  }

  /**
   * Get all public config values (safe to expose to client)
   */
  async getPublicConfigs(): Promise<Record<string, ConfigValue>> {
    const all = await this.getAll();
    const publicConfigs: Record<string, ConfigValue> = {};

    for (const def of CONFIG_DEFINITIONS) {
      if (def.isPublic) {
        publicConfigs[def.key] = all[def.key] ?? def.defaultValue;
      }
    }

    return publicConfigs;
  }
}

// Singleton instance
export const configManager = new ConfigManager();
