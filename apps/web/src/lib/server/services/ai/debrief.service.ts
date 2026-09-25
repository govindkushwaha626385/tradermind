// ──────────────────────────────────────────────
// TradeMind — Daily Debrief Service
//
// Generates an AI post-market executive summary.
// Cached once per day per user — 1 LLM call/day max.
// ──────────────────────────────────────────────

import { getDatabase, journalTrades, aiCache, users } from '@trademind/database';
import { eq, and, gte, lte } from 'drizzle-orm';
import { aiGenerate, isAiConfigured } from './ai.client';

export interface DailyDebriefResult {
  date: string;                  // ISO date string YYYY-MM-DD
  headline: string;              // 1-line executive summary
  pnlSummary: string;            // e.g., "Up ₹4,200 on 6 trades"
  winRate: string;               // e.g., "67%"
  topLesson: string;             // Key takeaway of the day
  emotionalPattern: string;      // Observed emotion trend
  tomorrowFocus: string;         // One specific goal for tomorrow
  stats: {
    totalTrades: number;
    wins: number;
    losses: number;
    netPnl: number;
    bestTrade: { symbol: string; pnl: number } | null;
    worstTrade: { symbol: string; pnl: number } | null;
  };
  provider: string;
  cached: boolean;
}

function getTodayRange(): { start: Date; end: Date; dateStr: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const dateStr = now.toISOString().split('T')[0] ?? now.toISOString().slice(0, 10);
  return { start, end, dateStr };
}

function buildDebriefPrompt(
  stats: DailyDebriefResult['stats'],
  emotions: Record<string, number>,
  mistakes: string[],
  curSymbol = '$'
): string {
  const winRate = stats.totalTrades > 0 ? ((stats.wins / stats.totalTrades) * 100).toFixed(0) : '0';
  const emotionSummary = Object.entries(emotions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([e, c]) => `${e}(${c})`)
    .join(', ') || 'none';
  const mistakeSummary = mistakes.slice(0, 3).join(', ') || 'none';

  return `You are a professional trading coach writing a daily debrief for a trader. Be concise, motivating, and actionable. Respond ONLY with valid JSON.

TODAY'S TRADING SUMMARY:
Trades: ${stats.totalTrades} (${stats.wins} wins, ${stats.losses} losses)
Win Rate: ${winRate}%
Net P&L: ${curSymbol}${stats.netPnl.toFixed(2)}
Best Trade: ${stats.bestTrade ? `${stats.bestTrade.symbol} +${curSymbol}${stats.bestTrade.pnl.toFixed(0)}` : 'N/A'}
Worst Trade: ${stats.worstTrade ? `${stats.worstTrade.symbol} -${curSymbol}${Math.abs(stats.worstTrade.pnl).toFixed(0)}` : 'N/A'}
Emotions Tagged: ${emotionSummary}
Mistakes Tagged: ${mistakeSummary}

Respond with exactly this JSON (all fields required, max 120 chars per field):
{
  "headline": "<1 punchy sentence summarizing the day>",
  "topLesson": "<the single most important lesson from today's trades>",
  "emotionalPattern": "<observation about today's emotional trading behavior>",
  "tomorrowFocus": "<one specific, actionable goal for tomorrow's session>"
}`;
}

/**
 * Generate or retrieve cached Daily Debrief for today.
 */
export async function getDailyDebrief(userId: string): Promise<DailyDebriefResult | null> {
  const db = getDatabase();
  const { start, end, dateStr } = getTodayRange();
  const cacheKey = `debrief:${dateStr}`;
  const now = new Date();

  // ── 1. Check cache ──────────────────────────────
  const [cached] = await db
    .select()
    .from(aiCache)
    .where(and(eq(aiCache.userId, userId), eq(aiCache.cacheKey, cacheKey)))
    .limit(1);

  if (cached && new Date(cached.expiresAt) > now) {
    const result = cached.result as DailyDebriefResult;
    return { ...result, cached: true };
  }

  // ── 2. Fetch today's trades & user currency ────
  const [userRecord] = await db
    .select({ currency: users.preferredCurrency })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const curSymbol =
    userRecord?.currency === 'USD' ? '$' :
    userRecord?.currency === 'EUR' ? '€' :
    userRecord?.currency === 'GBP' ? '£' :
    userRecord?.currency === 'USDT' ? '₮' : '₹';

  const trades = await db
    .select()
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        gte(journalTrades.openedAt, start),
        lte(journalTrades.openedAt, end),
      )
    );

  const targetTrades = trades.length > 0 ? trades : [];

  if (targetTrades.length === 0) {
    return null; // No trades today — no debrief needed
  }

  // ── 3. Compute stats ───────────────────────────
  const wins = targetTrades.filter((t) => Number(t.netPnl) > 0);
  const losses = targetTrades.filter((t) => Number(t.netPnl) <= 0);
  const netPnl = targetTrades.reduce((sum, t) => sum + Number(t.netPnl), 0);
  const winRate = targetTrades.length > 0 ? ((wins.length / targetTrades.length) * 100).toFixed(0) + '%' : '0%';

  const sortedByPnl = [...targetTrades].sort((a, b) => Number(b.netPnl) - Number(a.netPnl));
  const bestTradeRaw = sortedByPnl[0];
  const worstTradeRaw = sortedByPnl[sortedByPnl.length - 1];
  const bestTrade = bestTradeRaw ? { symbol: bestTradeRaw.tradingsymbol, pnl: Number(bestTradeRaw.netPnl) } : null;
  const worstTrade = worstTradeRaw && sortedByPnl.length > 1
    ? { symbol: worstTradeRaw.tradingsymbol, pnl: Number(worstTradeRaw.netPnl) }
    : null;

  // Aggregate emotions across all today's trades
  const emotionCounts: Record<string, number> = {};
  const mistakeSet = new Set<string>();
  for (const t of trades) {
    for (const e of (t.emotions as string[] | null) ?? []) {
      emotionCounts[e] = (emotionCounts[e] ?? 0) + 1;
    }
    for (const m of (t.mistakeTags as string[] | null) ?? []) {
      mistakeSet.add(m);
    }
  }

  const stats: DailyDebriefResult['stats'] = {
    totalTrades: targetTrades.length,
    wins: wins.length,
    losses: losses.length,
    netPnl,
    bestTrade,
    worstTrade,
  };

  const pnlSummary = `${netPnl >= 0 ? '+' : '-'}${curSymbol}${Math.abs(netPnl).toFixed(0)} on ${targetTrades.length} trade${targetTrades.length !== 1 ? 's' : ''}`;

  // ── 4. Build rule-based parts (always available) ──
  const topEmotion = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0];
  const emotionalPatternFallback = topEmotion
    ? `Dominant emotion today was ${topEmotion[0]} (${topEmotion[1]} trades). ${['FOMO', 'REVENGE', 'FEAR', 'GREEDY'].includes(topEmotion[0]) ? 'This negative pattern correlates with underperformance — schedule a review.' : 'This positive mindset contributed to your performance.'}`
    : 'No emotional tags recorded today.';

  // ── 5. Try AI for richer text ──────────────────
  let headline = `${netPnl >= 0 ? 'Profitable' : 'Difficult'} session — ${winRate} win rate on ${targetTrades.length} trades.`;
  let topLesson = 'Review your tagged mistakes and update your trading playbook accordingly.';
  let emotionalPattern = emotionalPatternFallback;
  let tomorrowFocus = 'Focus on following your pre-trade checklist and respecting your stop losses.';
  let provider = 'rule-based';

  if (isAiConfigured()) {
    const prompt = buildDebriefPrompt(stats, emotionCounts, Array.from(mistakeSet), curSymbol);
    const aiResult = await aiGenerate({ prompt, maxOutputTokens: 350, temperature: 0.5 });

    if (aiResult) {
      try {
        const cleaned = aiResult.text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        headline = String(parsed.headline ?? headline).slice(0, 150);
        topLesson = String(parsed.topLesson ?? topLesson).slice(0, 150);
        emotionalPattern = String(parsed.emotionalPattern ?? emotionalPattern).slice(0, 200);
        tomorrowFocus = String(parsed.tomorrowFocus ?? tomorrowFocus).slice(0, 150);
        provider = aiResult.provider;
      } catch {
        // Keep rule-based fallback values
      }
    }
  }

  const result: DailyDebriefResult = {
    date: dateStr,
    headline,
    pnlSummary,
    winRate,
    topLesson,
    emotionalPattern,
    tomorrowFocus,
    stats,
    provider,
    cached: false,
  };

  // ── 6. Cache until midnight ─────────────────────
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 0);

  await db
    .insert(aiCache)
    .values({
      userId,
      cacheKey,
      result: result as unknown as Record<string, unknown>,
      provider,
      tokensUsed: 0,
      expiresAt: midnight,
    })
    .onConflictDoUpdate({
      target: [aiCache.userId, aiCache.cacheKey],
      set: {
        result: result as unknown as Record<string, unknown>,
        provider,
        expiresAt: midnight,
        createdAt: now,
      },
    });

  return result;
}
