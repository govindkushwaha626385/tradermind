// ──────────────────────────────────────────────
// TradeMind — Supabase + Drizzle ORM Client
// ──────────────────────────────────────────────
// Uses Supabase for Auth, Realtime, Storage
// Uses Drizzle ORM (over postgres.js) for typed queries
// ──────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import type { Database as SupabaseDatabase } from './supabase.types';

// ── Supabase Client ─────────────────────────
let supabaseClient: ReturnType<typeof createClient<SupabaseDatabase>> | null = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase credentials not set. Provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  supabaseClient = createClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseClient;
}

// ── Supabase Admin Client (Server-side only, uses service_role key) ─
let supabaseAdminClient: ReturnType<typeof createClient<SupabaseDatabase>> | null = null;

export function getSupabaseAdmin() {
  if (supabaseAdminClient) return supabaseAdminClient;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase admin credentials not set. Provide NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  supabaseAdminClient = createClient<SupabaseDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}

// ── Drizzle ORM Client (for complex queries) ─
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabase() {
  if (db) return db;

  // Use Supabase's pooled connection string for direct DB access
  const connectionString =
    process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'Database connection string not set. Provide DATABASE_URL or SUPABASE_DATABASE_URL.',
    );
  }

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    ssl: 'require',
    prepare: false, // Required for Supabase's pgBouncer
  });

  db = drizzle(client, { schema });
  return db;
}

export type Database = ReturnType<typeof getDatabase>;
export type SupabaseClient = ReturnType<typeof getSupabaseClient>;
export { schema };
