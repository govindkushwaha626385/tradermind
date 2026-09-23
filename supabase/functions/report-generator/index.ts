// ──────────────────────────────────────────────
// TradeMind — Supabase Edge Function
// Function: report-generator
//
// Scheduled via pg_cron:
//   Daily report:  '30 12 * * *'   (6 PM IST)
//   Weekly report: '30 12 * * 0'   (Sunday 6 PM IST)
//
// Body: { type: 'daily' | 'weekly' }
// ──────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const INTERNAL_SECRET = Deno.env.get('INTERNAL_WORKER_SECRET') ?? '';
const NEXTJS_BASE_URL = Deno.env.get('NEXTJS_INTERNAL_URL') ?? Deno.env.get('NEXT_PUBLIC_APP_URL') ?? '';

serve(async (req: Request) => {
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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine — default to daily
  }

  const type = body.type ?? 'daily';

  const workerUrl = `${NEXTJS_BASE_URL}/api/v1/internal/workers/report-generator`;
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({ type }),
  });

  const result = await response.json().catch(() => ({ error: 'Unparseable upstream response' }));
  return new Response(JSON.stringify(result), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
