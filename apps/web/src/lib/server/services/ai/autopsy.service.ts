// ──────────────────────────────────────────────
// TradeMind — Trade Autopsy Service
//
// AI-powered per-trade post-mortem analysis.
// Produces: Process Grade (A–F), Execution Leak, Actionable Advice.
// Results are cached 24h in the ai_cache table.
// ──────────────────────────────────────────────

import { getDatabase, journalTrades, tradeRatings, tradePlans, aiCache } from '@trademind/database';
import { eq, and } from 'drizzle-orm';
import { aiGenerate, isAiConfigured } from './ai.client';

export interface TradeAutopsyResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeLabel: string;
  gradeColor: string;
  executionLeak: string;        // 1-2 sentence diagnosis of what went wrong
  strengths: string[];          // Up to 2 things done well
  advice: string[];             // 3 actionable improvement points
  riskManagementScore: number;  // 0–100
  emotionalScore: number;       // 0–100
  executionScore: number;       // 0–100
  overallScore: number;         // 0–100
  provider: string;
  cached: boolean;
}

const GRADE_MAP: Record<string, { label: string; color: string }> = {
  A: { label: 'Excellent Execution', color: '#22c55e' },
  B: { label: 'Good Trade', color: '#84cc16' },
  C: { label: 'Average Execution', color: '#f59e0b' },
  D: { label: 'Needs Improvement', color: '#f97316' },
  F: { label: 'Poor Execution', color: '#ef4444' },
};

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Build a compact, token-efficient prompt from trade data.
 * Keeps input under 600 tokens to minimize API costs.
 */
function buildAutopsyPrompt(trade: any, rating: any, plan: any): string {
  const pnl = Number(trade.netPnl).toFixed(2);
  const rr = trade.rMultiple ? `R=${Number(trade.rMultiple).toFixed(2)}` : 'R=N/A';
  const holdMin = trade.holdingPeriodMinutes ?? 'unknown';
  const emotions = (trade.emotions ?? []).join(', ') || 'none tagged';
  const mistakes = (trade.mistakeTags ?? []).join(', ') || 'none tagged';
  const notes = trade.traderNotes ? `"${trade.traderNotes.slice(0, 200)}"` : 'no notes';

  // Ratings from self-assessment
  const execRating = rating?.executionRating ?? 'not rated';
  const psychRating = rating?.psychologyRating ?? 'not rated';
  const planRating = rating?.planRating ?? 'not rated';
  const followedPlan = rating?.followedPlan === true ? 'Yes' : rating?.followedPlan === false ? 'No' : 'Unknown';

  // Trade plan comparison
  const plannedEntry = plan?.plannedEntryPrice ? `₹${plan.plannedEntryPrice}` : 'not set';
  const plannedSL = plan?.plannedStopLoss ? `₹${plan.plannedStopLoss}` : 'not set';
  const plannedTP = plan?.plannedTakeProfit ? `₹${plan.plannedTakeProfit}` : 'not set';

  return `You are a professional trading coach. Analyze this trade and respond ONLY with valid JSON (no markdown, no explanation outside JSON).

TRADE DATA:
Symbol: ${trade.tradingsymbol} (${trade.exchange})
Direction: ${trade.direction} | Status: ${trade.status}
Entry: ₹${Number(trade.avgEntryPrice).toFixed(2)} | Exit: ${trade.avgExitPrice ? `₹${Number(trade.avgExitPrice).toFixed(2)}` : 'open'}
Quantity: ${trade.totalQuantity} | Hold: ${holdMin} min
Net P&L: ₹${pnl} | ${rr}

PLANNED vs ACTUAL:
Planned Entry: ${plannedEntry} | Planned SL: ${plannedSL} | Planned TP: ${plannedTP}
Followed Plan: ${followedPlan}

PSYCHOLOGY:
Emotions: ${emotions}
Mistakes: ${mistakes}
Self-Ratings: Execution=${execRating}/5 Psychology=${psychRating}/5 Plan=${planRating}/5
Trader Notes: ${notes}

Respond with this JSON structure exactly:
{
  "overallScore": <0-100 integer>,
  "riskManagementScore": <0-100 integer>,
  "emotionalScore": <0-100 integer>,
  "executionScore": <0-100 integer>,
  "executionLeak": "<1-2 sentences: what was the primary execution failure or strength>",
  "strengths": ["<strength 1>", "<strength 2 if applicable>"],
  "advice": ["<actionable fix 1>", "<actionable fix 2>", "<actionable fix 3>"]
}`;
}

/**
 * Parse the AI JSON response safely.
 */
function parseAutopsyResponse(raw: string): Partial<TradeAutopsyResult> | null {
  try {
    // Strip potential markdown code fences
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (typeof parsed.overallScore !== 'number') return null;

    return {
      overallScore: Math.min(100, Math.max(0, Math.round(parsed.overallScore))),
      riskManagementScore: Math.min(100, Math.max(0, Math.round(parsed.riskManagementScore ?? 50))),
      emotionalScore: Math.min(100, Math.max(0, Math.round(parsed.emotionalScore ?? 50))),
      executionScore: Math.min(100, Math.max(0, Math.round(parsed.executionScore ?? 50))),
      executionLeak: String(parsed.executionLeak ?? '').slice(0, 300),
      strengths: (Array.isArray(parsed.strengths) ? parsed.strengths : []).slice(0, 2).map((s: any) => String(s).slice(0, 150)),
      advice: (Array.isArray(parsed.advice) ? parsed.advice : []).slice(0, 3).map((a: any) => String(a).slice(0, 200)),
    };
  } catch {
    return null;
  }
}

/**
 * Main: run or retrieve cached Trade Autopsy for a given trade.
 */
export async function runTradeAutopsy(userId: string, tradeId: string): Promise<TradeAutopsyResult | null> {
  const db = getDatabase();
  const cacheKey = `autopsy:${tradeId}`;
  const now = new Date();

  // ── 1. Check cache ──────────────────────────
  const [cached] = await db
    .select()
    .from(aiCache)
    .where(and(eq(aiCache.userId, userId), eq(aiCache.cacheKey, cacheKey)))
    .limit(1);

  if (cached && new Date(cached.expiresAt) > now) {
    const result = cached.result as TradeAutopsyResult;
    return { ...result, cached: true };
  }

  // ── 2. Fetch trade (ownership check) ─────────
  const [trade] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, userId)))
    .limit(1);

  if (!trade) return null;

  // ── 3. Enrich with ratings & plan ─────────────
  const [rating] = await db
    .select()
    .from(tradeRatings)
    .where(eq(tradeRatings.journalTradeId, tradeId))
    .limit(1);

  const [plan] = await db
    .select()
    .from(tradePlans)
    .where(eq(tradePlans.journalTradeId, tradeId))
    .limit(1);

  // ── 4. Check AI availability ────────────────────
  if (!isAiConfigured()) {
    // Build a deterministic rule-based fallback (no LLM needed)
    return buildRuleBasedAutopsy(trade, rating, plan);
  }

  // ── 5. Call AI ────────────────────────────────
  const prompt = buildAutopsyPrompt(trade, rating, plan);
  const aiResult = await aiGenerate({ prompt, maxOutputTokens: 500, temperature: 0.3 });

  if (!aiResult) {
    // AI failed — fall back to rule-based
    return buildRuleBasedAutopsy(trade, rating, plan);
  }

  const parsed = parseAutopsyResponse(aiResult.text);
  if (!parsed || parsed.overallScore === undefined) {
    return buildRuleBasedAutopsy(trade, rating, plan);
  }

  const grade = scoreToGrade(parsed.overallScore);
  const gradeInfo = GRADE_MAP[grade] ?? { label: 'Average Execution', color: '#f59e0b' };

  const result: TradeAutopsyResult = {
    grade,
    gradeLabel: gradeInfo.label,
    gradeColor: gradeInfo.color,
    executionLeak: parsed.executionLeak ?? 'No specific execution issues detected.',
    strengths: parsed.strengths ?? [],
    advice: parsed.advice ?? [],
    riskManagementScore: parsed.riskManagementScore ?? 50,
    emotionalScore: parsed.emotionalScore ?? 50,
    executionScore: parsed.executionScore ?? 50,
    overallScore: parsed.overallScore,
    provider: aiResult.provider,
    cached: false,
  };

  // ── 6. Persist to cache (24h TTL) ────────────
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await db
    .insert(aiCache)
    .values({
      userId,
      cacheKey,
      result: result as unknown as Record<string, unknown>,
      provider: aiResult.provider,
      tokensUsed: aiResult.tokensUsed,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [aiCache.userId, aiCache.cacheKey],
      set: {
        result: result as unknown as Record<string, unknown>,
        provider: aiResult.provider,
        tokensUsed: aiResult.tokensUsed,
        expiresAt,
        createdAt: now,
      },
    });

  return result;
}

// ── Rule-based fallback (no LLM cost) ────────────

function buildRuleBasedAutopsy(trade: any, rating: any, plan: any): TradeAutopsyResult {
  let score = 50;
  const advice: string[] = [];
  const strengths: string[] = [];
  const issues: string[] = [];

  const pnl = Number(trade.netPnl);
  const rMultiple = trade.rMultiple ? Number(trade.rMultiple) : null;
  const emotions = (trade.emotions ?? []) as string[];
  const mistakes = (trade.mistakeTags ?? []) as string[];

  // P&L impact
  if (pnl > 0) { score += 10; strengths.push('Profitable trade — capital preserved and grown.'); }
  else { score -= 5; }

  // R-Multiple quality
  if (rMultiple !== null) {
    if (rMultiple >= 2) { score += 15; strengths.push(`Strong R-multiple of ${rMultiple.toFixed(1)}R achieved.`); }
    else if (rMultiple >= 1) score += 5;
    else if (rMultiple < 0) score -= 15;
  }

  // Plan adherence
  if (rating?.followedPlan === true) { score += 10; }
  else if (rating?.followedPlan === false) {
    score -= 10;
    advice.push('Always document and strictly follow your trade plan. Deviations compound over time.');
  }

  // Emotional discipline
  const badEmotions = emotions.filter((e) => ['FOMO', 'REVENGE', 'GREEDY', 'FEAR'].includes(e));
  if (badEmotions.length > 0) {
    score -= badEmotions.length * 8;
    issues.push(`Negative emotions detected: ${badEmotions.join(', ')}`);
    advice.push('When experiencing strong emotions, reduce position size by 50% or skip the trade entirely.');
  }

  // Mistake tags
  if (mistakes.length > 0) {
    score -= mistakes.length * 5;
    advice.push(`Address recurring mistakes: ${mistakes.slice(0, 3).join(', ')}. Review your playbook rules.`);
  }

  // Execution ratings
  const execRating = rating?.executionRating ?? 0;
  if (execRating >= 4) { score += 5; }
  else if (execRating > 0 && execRating <= 2) {
    score -= 5;
    advice.push('Practice entering trades at predefined price levels using limit orders to improve execution.');
  }

  // Fill advice slots
  if (advice.length === 0) {
    advice.push('Continue logging emotions and comparing planned vs actual entries for pattern recognition.');
  }
  if (advice.length < 2) {
    advice.push('Review this trade against your playbook criteria to reinforce what worked.');
  }
  if (advice.length < 3 && !plan) {
    advice.push('Create a trade plan before every entry (entry, stop loss, target) to measure plan adherence.');
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  const grade = scoreToGrade(finalScore);
  const gradeInfo = GRADE_MAP[grade] ?? { label: 'Average Execution', color: '#f59e0b' };

  const executionLeak = issues.length > 0
    ? issues.join('. ') + '.'
    : pnl >= 0
      ? 'Execution was solid with no major red flags detected.'
      : 'Trade closed at a loss. Review your stop-loss placement and risk-per-trade.';

  return {
    grade,
    gradeLabel: gradeInfo.label,
    gradeColor: gradeInfo.color,
    executionLeak,
    strengths: strengths.slice(0, 2),
    advice: advice.slice(0, 3),
    riskManagementScore: Math.min(100, Math.max(0, 50 + (rMultiple ? rMultiple * 10 : 0))),
    emotionalScore: Math.max(0, 100 - badEmotions.length * 20),
    executionScore: execRating > 0 ? execRating * 20 : 50,
    overallScore: finalScore,
    provider: 'rule-based',
    cached: false,
  };
}
