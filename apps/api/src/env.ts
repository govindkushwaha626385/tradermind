// ──────────────────────────────────────────────
// TradeMind — Environment Configuration & Validation
//
// Uses Zod to parse and validate process.env at startup.
// In production, fails fast with descriptive errors if required
// secrets are missing. In development/test, provides sensible defaults.
// ──────────────────────────────────────────────

import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// Automatically load root .env if not yet loaded in environment
try {
  const rootEnv = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(rootEnv) && typeof (process as any).loadEnvFile === 'function') {
    (process as any).loadEnvFile(rootEnv);
  }
} catch {
  // Ignore if already loaded or not supported
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // Database & Supabase
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // Security
  ENCRYPTION_KEY: z.string().optional(),

  // Payments (Razorpay)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),

  // AI Providers
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function validateEnv(): Env {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    const errors = result.error.format();
    for (const [key, value] of Object.entries(errors)) {
      if (key !== '_errors') {
        console.error(`   - ${key}: ${(value as any)?._errors?.join(', ')}`);
      }
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Fatal: Invalid environment configuration in production');
    }
  }

  const env = result.success ? result.data : (process.env as unknown as Env);

  // Production critical checks
  if (process.env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!process.env.DATABASE_URL && !process.env.SUPABASE_DATABASE_URL) missing.push('DATABASE_URL');
    if (!process.env.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY');

    if (missing.length > 0) {
      const msg = `🚨 FATAL: Missing critical production environment variables: ${missing.join(', ')}`;
      console.error(msg);
      throw new Error(msg);
    }
  }

  parsedEnv = env;
  return env;
}

export const env = validateEnv();
