// ──────────────────────────────────────────────
// TradeMind — High-Impact Economic Calendar API Route
// GET /api/v1/news/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { ok, apiError } from '@/lib/server/response';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { fetchEconomicCalendar } from '@/lib/server/services/finnhub-news.service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, 'public-calendar');
    if (rl) return rl;

    const url = new URL(req.url);
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    const events = await fetchEconomicCalendar(from, to);
    return ok(events);
  } catch (err: any) {
    console.error('Error fetching economic calendar:', err);
    return apiError(err?.message || 'Failed to fetch economic calendar', 500);
  }
}
