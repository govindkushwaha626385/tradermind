// ──────────────────────────────────────────────
// TradeMind — Supabase Edge Function
// Function: sync-worker
//
// Triggered by a Supabase pg_cron job or manually
// via POST /functions/v1/sync-worker
//
// Body: { connectionId: string, userId: string, brokerId: string }
//
// Invokes the Next.js internal sync endpoint so all
// service logic lives in one place (apps/web).
// ──────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const INTERNAL_SECRET = Deno.env.get('INTERNAL_WORKER_SECRET') ?? '';
const NEXTJS_BASE_URL = Deno.env.get('NEXTJS_INTERNAL_URL') ?? Deno.env.get('NEXT_PUBLIC_APP_URL') ?? '';

serve(async (req: Request) => {
  // Validate the caller is an authorised internal service
  const authHeader = req.headers.get('authorization') ?? '';
  if (!INTERNAL_SECRET || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { connectionId, userId, brokerId } = body as {
    connectionId?: string;
    userId?: string;
    brokerId?: string;
  };

  if (!connectionId || !userId || !brokerId) {
    return new Response(
      JSON.stringify({ error: 'connectionId, userId, and brokerId are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Delegate to Next.js internal worker endpoint
  const workerUrl = `${NEXTJS_BASE_URL}/api/v1/internal/workers/sync`;
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({ connectionId, userId, brokerId }),
  });

  const result = await response.json().catch(() => ({ error: 'Unparseable upstream response' }));

  return new Response(JSON.stringify(result), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
