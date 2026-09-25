// ──────────────────────────────────────────────
// TradeMind — AI Journal Autofill & Assistant Service
//
// 1-Click zero-cost AI Journaling for traders.
// Uses Gemini 2.0 Flash Lite → Groq Llama 3.3 → Rule Engine.
// Auto-generates:
// - Emotion tags
// - Execution mistake tags
// - Self-ratings (Execution, Plan, Psychology 1-5)
// - Trader reflection narrative
// - Golden rule / lesson learned
// - Strategy / setup classification
// ──────────────────────────────────────────────

import {
  getDatabase,
  journalTrades,
  tradeRatings,
  tradePlans,
  aiCache,
} from '@trademind/database';
import { eq, and, inArray } from 'drizzle-orm';
import { aiGenerate, isAiConfigured } from './ai.client';
import { EMOTIONS, MISTAKE_TAGS } from '@trademind/shared';
import type { Emotion, MistakeTag } from '@trademind/shared';
import type { JournalAutofillResult, BatchAutofillResult } from '@trademind/shared';

function sanitizeEmotions(raw: any[]): Emotion[] {
  if (!Array.isArray(raw)) return ['DISCIPLINED'];
  const valid = raw
    .map((e) => String(e).toUpperCase().trim())
    .filter((e): e is Emotion => (EMOTIONS as readonly string[]).includes(e));
  return valid.length > 0 ? valid.slice(0, 3) : ['NEUTRAL'];
}

function sanitizeMistakes(raw: any[]): MistakeTag[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => String(m).toUpperCase().trim())
    .filter((m): m is MistakeTag => (MISTAKE_TAGS as readonly string[]).includes(m))
    .slice(0, 3);
}

function clampRating(val: any, fallback = 4): number {
  const num = Number(val);
  if (isNaN(num) || num < 1 || num > 5) return fallback;
  return Math.round(num);
}

/**
 * Builds token-compact prompt (under 400 tokens)
 */
function buildAutofillPrompt(trade: any, plan: any): string {
  const pnl = Number(trade.netPnl ?? 0);
  const isWin = pnl >= 0;
  const holdMin = trade.holdingPeriodMinutes ?? 0;
  const entry = Number(trade.avgEntryPrice ?? 0).toFixed(2);
  const exit = trade.avgExitPrice ? Number(trade.avgExitPrice).toFixed(2) : 'N/A';
  const qty = trade.totalQuantity ?? 0;
  const cur = trade.currency || 'USD';
  const curSymbol =
    cur === 'USD' ? '$' :
    cur === 'EUR' ? '€' :
    cur === 'GBP' ? '£' :
    cur === 'USDT' ? '₮' :
    cur === 'INR' ? '₹' : '$';

  return `You are an elite trading performance psychologist and prop desk risk manager.
Analyze this closed trade execution and generate the trader's post-trade journal entry.
Respond ONLY with a valid JSON object matching this schema (no markdown, no other text):

{
  "emotions": ["<1-2 from: ${EMOTIONS.join(', ')}>"],
  "mistakeTags": ["<0-2 from: ${MISTAKE_TAGS.join(', ')}>"],
  "followedPlan": <true or false>,
  "executionRating": <1 to 5 integer>,
  "planRating": <1 to 5 integer>,
  "psychologyRating": <1 to 5 integer>,
  "reflection": "<2-3 sentences: what occurred in price action, trigger context, and mental state during hold>",
  "lessonLearned": "<1 crisp golden rule / takeaway for this specific setup>",
  "suggestedSetup": "<e.g. Opening Range Breakout, VWAP Pullback, Support/Resistance Bounce, Trend Continuation, or Mean Reversion>",
  "keyHighlights": ["<highlight 1>", "<highlight 2>"]
}

TRADE METRICS:
Symbol: ${trade.tradingsymbol}
Direction: ${trade.direction}
Entry: ${curSymbol}${entry} | Exit: ${curSymbol}${exit}
Quantity: ${qty}
Holding Period: ${holdMin} minutes
Net P&L: ${curSymbol}${pnl.toFixed(2)} (${isWin ? 'PROFITABLE' : 'LOSS'})
Compliance: ${trade.ruleComplianceScore ? `${Math.round(trade.ruleComplianceScore * 100)}%` : 'unrated'}
Planned SL: ${plan?.plannedStopLoss ? `${curSymbol}${plan.plannedStopLoss}` : 'unspecified'}
Planned TP: ${plan?.plannedTakeProfit ? `${curSymbol}${plan.plannedTakeProfit}` : 'unspecified'}`;
}

/**
 * Deterministic rule-based fallback when AI is unavailable or fails
 */
function buildRuleBasedAutofill(trade: any): JournalAutofillResult {
  const pnl = Number(trade.netPnl ?? 0);
  const isWin = pnl >= 0;
  const holdMin = Number(trade.holdingPeriodMinutes ?? 0);
  const symbol = trade.tradingsymbol || 'Instrument';
  const dir = trade.direction || 'LONG';
  const cur = trade.currency || 'USD';
  const curSymbol =
    cur === 'USD' ? '$' :
    cur === 'EUR' ? '€' :
    cur === 'GBP' ? '£' :
    cur === 'USDT' ? '₮' :
    cur === 'INR' ? '₹' : '$';

  if (isWin) {
    const isQuickScalp = holdMin > 0 && holdMin <= 5;
    return {
      tradeId: trade.id,
      symbol,
      emotions: isQuickScalp ? ['CONFIDENT'] : ['CONFIDENT', 'DISCIPLINED'],
      mistakeTags: isQuickScalp ? ['EARLY_EXIT'] : [],
      followedPlan: true,
      executionRating: 4,
      planRating: 4,
      psychologyRating: 5,
      reflection: `Clean ${dir} trade on ${symbol} returning +${curSymbol}${pnl.toFixed(2)}. Entry executed in alignment with technical structure and held for ${holdMin || 10} minutes with composed risk management.`,
      lessonLearned: `Maintain systematic discipline and allow high-probability runners to reach full technical targets.`,
      suggestedSetup: isQuickScalp ? 'Momentum Scalp' : 'Trend Continuation',
      keyHighlights: ['Positive risk-to-reward realized', 'Controlled execution'],
      provider: 'rule-engine',
      cached: false,
    };
  } else {
    const heldTooLong = holdMin > 60;
    return {
      tradeId: trade.id,
      symbol,
      emotions: ['ANXIOUS'],
      mistakeTags: heldTooLong ? ['DEVIATED_FROM_PLAN'] : ['IMPULSE_ENTRY'],
      followedPlan: false,
      executionRating: 3,
      planRating: 3,
      psychologyRating: 3,
      reflection: `${dir} trade on ${symbol} reached stop loss of -${curSymbol}${Math.abs(pnl).toFixed(2)}. Market failed to follow through on the breakout level. Accepted the loss without revenge-trading.`,
      lessonLearned: `Honor technical invalidation levels immediately to preserve mental capital and drawdown limits.`,
      suggestedSetup: 'Breakout Failure / Mean Reversion',
      keyHighlights: ['Loss contained within risk budget', 'No impulsive revenge trades taken'],
      provider: 'rule-engine',
      cached: false,
    };
  }
}

/**
 * Generate 1-Click AI Autofill for a single journal trade
 */
export async function generateJournalAutofill(
  userId: string,
  tradeId: string,
): Promise<JournalAutofillResult | null> {
  const db = getDatabase();
  const cacheKey = `autofill:${tradeId}`;
  const now = new Date();

  // 1. Check cache (24h TTL)
  const [cached] = await db
    .select()
    .from(aiCache)
    .where(and(eq(aiCache.userId, userId), eq(aiCache.cacheKey, cacheKey)))
    .limit(1);

  if (cached && new Date(cached.expiresAt) > now) {
    const res = cached.result as JournalAutofillResult;
    return { ...res, cached: true };
  }

  // 2. Query trade
  const [trade] = await db
    .select()
    .from(journalTrades)
    .where(and(eq(journalTrades.id, tradeId), eq(journalTrades.userId, userId)))
    .limit(1);

  if (!trade) return null;

  // 3. Query trade plan if exists
  const [plan] = await db
    .select()
    .from(tradePlans)
    .where(eq(tradePlans.journalTradeId, tradeId))
    .limit(1);

  // 4. Check AI availability
  if (!isAiConfigured()) {
    return buildRuleBasedAutofill(trade);
  }

  // 5. Generate with AI
  const prompt = buildAutofillPrompt(trade, plan);
  const aiRes = await aiGenerate({ prompt, maxOutputTokens: 400, temperature: 0.3 });

  if (!aiRes) {
    return buildRuleBasedAutofill(trade);
  }

  try {
    const cleaned = aiRes.text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    const result: JournalAutofillResult = {
      tradeId: trade.id,
      symbol: trade.tradingsymbol || 'Trade',
      emotions: sanitizeEmotions(parsed.emotions),
      mistakeTags: sanitizeMistakes(parsed.mistakeTags),
      followedPlan: parsed.followedPlan ?? Number(trade.netPnl ?? 0) >= 0,
      executionRating: clampRating(parsed.executionRating, 4),
      planRating: clampRating(parsed.planRating, 4),
      psychologyRating: clampRating(parsed.psychologyRating, 4),
      reflection: String(parsed.reflection ?? '').slice(0, 2000) || `${trade.direction} trade on ${trade.tradingsymbol}.`,
      lessonLearned: String(parsed.lessonLearned ?? '').slice(0, 1000) || 'Always stick to predetermined stop loss and profit targets.',
      suggestedSetup: parsed.suggestedSetup ? String(parsed.suggestedSetup).slice(0, 100) : undefined,
      keyHighlights: Array.isArray(parsed.keyHighlights) ? parsed.keyHighlights.slice(0, 3).map((h: any) => String(h).slice(0, 150)) : [],
      provider: aiRes.provider,
      cached: false,
    };

    // 6. Cache result for 24 hours
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await db
      .insert(aiCache)
      .values({
        userId,
        cacheKey,
        result: result as unknown as Record<string, unknown>,
        provider: aiRes.provider,
        tokensUsed: aiRes.tokensUsed,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [aiCache.userId, aiCache.cacheKey],
        set: {
          result: result as unknown as Record<string, unknown>,
          provider: aiRes.provider,
          tokensUsed: aiRes.tokensUsed,
          expiresAt,
          createdAt: now,
        },
      });

    return result;
  } catch (err) {
    console.warn('[AI Autofill Parse Error]', err);
    return buildRuleBasedAutofill(trade);
  }
}

/**
 * Automatically applies AI journaling to batch of trades and saves directly to database
 */
export async function applyBatchJournalAutofill(
  userId: string,
  tradeIds?: string[],
): Promise<BatchAutofillResult> {
  const db = getDatabase();

  // Find target closed trades
  let targetTrades: any[] = [];
  if (tradeIds && tradeIds.length > 0) {
    targetTrades = await db
      .select()
      .from(journalTrades)
      .where(and(eq(journalTrades.userId, userId), inArray(journalTrades.id, tradeIds)))
      .limit(20);
  } else {
    // Find up to 10 trades that have no ratings yet
    targetTrades = await db
      .select()
      .from(journalTrades)
      .where(eq(journalTrades.userId, userId))
      .limit(10);
  }

  const results: JournalAutofillResult[] = [];

  for (const trade of targetTrades) {
    try {
      const autofill = await generateJournalAutofill(userId, trade.id);
      if (!autofill) continue;

      // 1. Save or update tradeRating in database
      await db
        .insert(tradeRatings)
        .values({
          userId,
          journalTradeId: trade.id,
          executionRating: autofill.executionRating,
          planRating: autofill.planRating,
          psychologyRating: autofill.psychologyRating,
          emotions: autofill.emotions,
          mistakeTags: autofill.mistakeTags,
          reflection: autofill.reflection,
          lessonLearned: autofill.lessonLearned,
          followedPlan: autofill.followedPlan,
        })
        .onConflictDoUpdate({
          target: [tradeRatings.userId, tradeRatings.journalTradeId],
          set: {
            executionRating: autofill.executionRating,
            planRating: autofill.planRating,
            psychologyRating: autofill.psychologyRating,
            emotions: autofill.emotions,
            mistakeTags: autofill.mistakeTags,
            reflection: autofill.reflection,
            lessonLearned: autofill.lessonLearned,
            followedPlan: autofill.followedPlan,
            updatedAt: new Date(),
          },
        });

      // 2. Also update journalTrades emotion & mistake tags for immediate list visibility
      await db
        .update(journalTrades)
        .set({
          emotions: autofill.emotions,
          mistakeTags: autofill.mistakeTags,
          updatedAt: new Date(),
        })
        .where(eq(journalTrades.id, trade.id));

      results.push(autofill);
    } catch (err) {
      console.error(`[Batch Autofill Error for ${trade.id}]`, err);
    }
  }

  return {
    totalProcessed: results.length,
    results,
  };
}
