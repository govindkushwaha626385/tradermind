// ──────────────────────────────────────────────
// TradeMind — Supabase Edge Function
// Function: token-refresh
//
// Scheduled via pg_cron: every 15 minutes
//   SELECT cron.schedule('token-refresh', '*/15 * * * *',
//     $$SELECT net.http_post(
//       url := 'https://<ref>.supabase.co/functions/v1/token-refresh',
//       headers := '{"Authorization":"Bearer <INTERNAL_SECRET>"}'::jsonb,
//       body := '{}'::jsonb
//     )$$);
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

  const workerUrl = `${NEXTJS_BASE_URL}/api/v1/internal/workers/token-refresh`;
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({}),
  });

  const result = await response.json().catch(() => ({ error: 'Unparseable upstream response' }));
  return new Response(JSON.stringify(result), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
