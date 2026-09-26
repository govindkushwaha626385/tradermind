// ──────────────────────────────────────────────
// TradeMind — Real-Time Market News API Route
// GET /api/v1/news?category=general|forex|crypto
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { ok, apiError } from '@/lib/server/response';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { fetchFinnhubNews } from '@/lib/server/services/finnhub-news.service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, 'public-news');
    if (rl) return rl;

    const url = new URL(req.url);
    const category = (url.searchParams.get('category') || 'general') as 'general' | 'forex' | 'crypto';
    const minId = parseInt(url.searchParams.get('minId') || '0', 10);

    const news = await fetchFinnhubNews(category, isNaN(minId) ? 0 : minId);
    return ok(news);
  } catch (err: any) {
    console.error('Error fetching market news:', err);
    return apiError(err?.message || 'Failed to fetch market news', 500);
  }
}
