// ──────────────────────────────────────────────
// TradeMind — AI Conversational Assistant & Chart Analysis Service
//
// Features:
// 1. Live Context-Aware Trading Assistant:
//    Extracts real-time trading statistics, recent trade outcomes,
//    top behavioral leaks, open positions, and today's premarket plan
//    to coach the trader with pinpoint accuracy.
//
// 2. Multimodal Chart Analysis:
//    Takes uploaded candlestick / price chart images, detects market structure,
//    trend, key levels, patterns, invalidation levels, and cross-references
//    against the user's daily premarket bias.
// ──────────────────────────────────────────────

import {
  getDatabase,
  journalTrades,
  dailyPremarketPlans,
  users,
} from '@trademind/database';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { aiChat, aiVision, isAiConfigured } from './ai.client';
import { runBehavioralShield } from './shield.service';
import type { AiChatMessage, AiChatResponse } from '@trademind/shared';

export interface TraderLiveContext {
  traderName: string;
  totalTradesRecorded: number;
  winRate30d: number;
  netPnl30d: number;
  profitFactor: number;
  topMistakes: string[];
  topEmotions: string[];
  todayPremarketBias?: string;
  todayPremarketLevels?: string;
  todayMaxLoss?: number;
  recentTradesSummary: string[];
  behavioralAlerts: string[];
}

/**
 * Assemble rich live context for the trader
 */
export async function getTraderLiveContext(userId: string): Promise<TraderLiveContext> {
  const db = getDatabase();

  // User profile
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const traderName = user?.name ?? 'Trader';

  // 30-day window
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Recent trades
  const recentTrades = await db
    .select({
      id: journalTrades.id,
      symbol: journalTrades.tradingsymbol,
      direction: journalTrades.direction,
      status: journalTrades.status,
      netPnl: journalTrades.netPnl,
      emotions: journalTrades.emotions,
      mistakeTags: journalTrades.mistakeTags,
      openedAt: journalTrades.openedAt,
      closedAt: journalTrades.closedAt,
    })
    .from(journalTrades)
    .where(
      and(
        eq(journalTrades.userId, userId),
        gte(sql`COALESCE(${journalTrades.closedAt}, ${journalTrades.openedAt})`, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(sql`COALESCE(${journalTrades.closedAt}, ${journalTrades.openedAt})`))
    .limit(30);

  let winCount = 0;
  let totalPnl = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  const mistakeCounts: Record<string, number> = {};
  const emotionCounts: Record<string, number> = {};

  for (const t of recentTrades) {
    const pnl = t.netPnl ?? 0;
    totalPnl += pnl;
    if (pnl > 0) {
      winCount++;
      grossProfit += pnl;
    } else if (pnl < 0) {
      grossLoss += Math.abs(pnl);
    }

    if (Array.isArray(t.mistakeTags)) {
      for (const m of t.mistakeTags) {
        mistakeCounts[m] = (mistakeCounts[m] ?? 0) + 1;
      }
    }
    if (Array.isArray(t.emotions)) {
      for (const e of t.emotions) {
        emotionCounts[e] = (emotionCounts[e] ?? 0) + 1;
      }
    }
  }

  const winRate30d = recentTrades.length > 0 ? (winCount / recentTrades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

  const topMistakes = Object.entries(mistakeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => `${tag} (${count}x)`);

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => `${tag} (${count}x)`);

  // Today's premarket plan
  const todayStr = new Date().toISOString().slice(0, 10);
  const [premarket] = await db
    .select()
    .from(dailyPremarketPlans)
    .where(and(eq(dailyPremarketPlans.userId, userId), eq(dailyPremarketPlans.date, todayStr)))
    .limit(1);

  // Behavioral Shield check
  let behavioralAlerts: string[] = [];
  try {
    const shield = await runBehavioralShield(userId);
    if (shield?.flags && shield.flags.length > 0) {
      behavioralAlerts = shield.flags.map((f: any) => `${f.type}: ${f.message}`);
    }
  } catch {
    // Non-blocking
  }

  const recentTradesSummary = recentTrades.slice(0, 5).map(
    (t) =>
      `${t.direction} ${t.symbol} → ${t.netPnl && t.netPnl >= 0 ? `+₹${t.netPnl.toFixed(2)} (WIN)` : `-₹${Math.abs(t.netPnl ?? 0).toFixed(2)} (LOSS)`}`,
  );

  return {
    traderName,
    totalTradesRecorded: recentTrades.length,
    winRate30d: Math.round(winRate30d),
    netPnl30d: Math.round(totalPnl),
    profitFactor: Math.round(profitFactor * 100) / 100,
    topMistakes,
    topEmotions,
    todayPremarketBias: premarket?.marketBias ?? undefined,
    todayPremarketLevels: premarket?.keyLevels ?? undefined,
    todayMaxLoss: premarket?.maxDailyLoss ?? undefined,
    recentTradesSummary,
    behavioralAlerts,
  };
}

/**
 * Conversational AI Assistant
 */
export async function handleAssistantChat(
  userId: string,
  history: AiChatMessage[],
  newMessage: string,
): Promise<AiChatResponse> {
  if (!isAiConfigured()) {
    return {
      message:
        "AI Assistant is currently offline. Please configure GEMINI_API_KEY or GROQ_API_KEY to enable real-time trading coaching.",
      provider: 'none',
      cached: false,
      contextUsed: [],
    };
  }

  const context = await getTraderLiveContext(userId);

  const contextUsed = [
    `30D Win Rate: ${context.winRate30d}%`,
    `30D PnL: ₹${context.netPnl30d}`,
    `Profit Factor: ${context.profitFactor}`,
    context.todayPremarketBias ? `Today's Bias: ${context.todayPremarketBias}` : 'No pre-market plan logged today',
    context.topMistakes.length > 0 ? `Recurring Leaks: ${context.topMistakes.join(', ')}` : 'Clean execution history',
  ];

  const systemPrompt = `You are TradeMind AI Copilot — an elite, compassionate, and hyper-disciplined trading coach and behavioral psychologist.
You work 1-on-1 with trader ${context.traderName}.

### Live Trader Performance Context:
- Past 30 Days Trades Analyzed: ${context.totalTradesRecorded}
- Win Rate: ${context.winRate30d}%
- Net Realized PnL: ₹${context.netPnl30d}
- Profit Factor: ${context.profitFactor}
- Most Common Execution Leaks: ${context.topMistakes.join(', ') || 'None flagged'}
- Dominant Emotional States: ${context.topEmotions.join(', ') || 'Balanced'}
- Today's Pre-Market Plan Bias: ${context.todayPremarketBias || 'Not planned yet'}
- Today's Max Daily Loss Limit: ${context.todayMaxLoss ? `₹${context.todayMaxLoss}` : 'Not set'}
- Today's Key Levels: ${context.todayPremarketLevels || 'None noted'}
- Active Behavioral Shield Warnings: ${context.behavioralAlerts.join('; ') || 'All clear'}
- Last 5 Trades: ${context.recentTradesSummary.join(' | ') || 'No recent trades'}

### Your Core Directives:
1. Always prioritize RISK MANAGEMENT, capital preservation, and psychological discipline over profit chasing.
2. If the user expresses FOMO, revenge trading instincts, or urges to oversize, firmly ground them and cite their historical leaks.
3. If they ask about trade setups or ideas, refer to their pre-market bias and remind them to wait for confluence and predefined stop loss.
4. Keep answers sharp, high-conviction, professional, and empathetic. Use bullet points or concise paragraphs. Avoid generic fluff.
5. If the trader has broken their max daily loss or is on a losing streak, advise them to step away from the screens for the day.`;

  const messagesPayload = [
    ...history.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user' as const, content: newMessage },
  ];

  const result = await aiChat({
    systemPrompt,
    messages: messagesPayload,
    maxOutputTokens: 900,
    temperature: 0.6,
  });

  if (!result) {
    return {
      message:
        "I'm temporarily having trouble connecting to the intelligence engine. Please review your risk limits and try again in a moment.",
      provider: 'fallback',
      cached: false,
      contextUsed,
    };
  }

  return {
    message: result.text,
    provider: result.provider,
    cached: false,
    contextUsed,
  };
}

/**
 * Chart Image Multimodal Analysis
 */
export async function handleChartAnalysis(
  userId: string,
  imageBase64: string,
  mimeType: string,
  userNotes?: string,
): Promise<{
  analysis: string;
  summary: {
    symbol?: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    keySupport?: string;
    keyResistance?: string;
    suggestedStopLoss?: string;
    suggestedTarget?: string;
    riskReward?: string;
    pattern?: string;
  };
  provider: string;
}> {
  const context = await getTraderLiveContext(userId);

  const prompt = `You are TradeMind's senior quantitative and technical price-action chart analyst.
The trader ${context.traderName} has uploaded a screenshot of their trading chart.
${userNotes ? `Trader's Note/Question: "${userNotes}"` : ''}

Trader's Current Context:
- Today's Pre-Market Plan Bias: ${context.todayPremarketBias || 'NEUTRAL'}
- 30-Day Win Rate: ${context.winRate30d}%
- Top behavioral mistake: ${context.topMistakes[0] || 'Overtrading'}

Please perform a thorough, institutional-grade technical breakdown of this chart:
1. **Market Structure & Trend**: Identify the prevailing trend (higher highs/lows or lower highs/lows) and timeframe if visible.
2. **Key Support & Resistance Levels**: Identify visible horizontal key zones, supply/demand order blocks, or liquidity pools.
3. **Price Action Patterns**: State any chart or candlestick patterns (e.g. Fair Value Gap, Liquidity Sweep, Double Bottom/Top, Flag, Channel).
4. **Trade Idea & Invalidation (Risk/Reward)**:
   - Direction (Long / Short / Wait)
   - Ideal Entry Zone
   - Stop Loss Invalidation Level (exact price or structural placement)
   - Take Profit / Target Levels (with estimated Risk:Reward ratio)
5. **Pre-market Alignment Check**: Explicitly verify if this setup aligns with or violates their daily bias (${context.todayPremarketBias || 'NEUTRAL'}).
6. **Psychology & Execution Tip**: Give 1 specific rule to execute this cleanly without FOMO.

At the very end of your response, output a JSON block wrapped in \`\`\`json\`\`\` with this exact schema:
\`\`\`json
{
  "symbol": "SYMBOL_OR_UNKNOWN",
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "keySupport": "price or description",
  "keyResistance": "price or description",
  "suggestedStopLoss": "price or level",
  "suggestedTarget": "price or level",
  "riskReward": "e.g. 1:2.5",
  "pattern": "pattern name"
}
\`\`\``;

  const result = await aiVision({
    prompt,
    imageBase64,
    mimeType: mimeType || 'image/png',
    maxOutputTokens: 1400,
  });

  if (!result) {
    throw new Error('Chart analysis is temporarily unavailable or Gemini API key is missing.');
  }

  // Parse JSON summary from markdown if present
  let summary = {
    symbol: 'CHART',
    bias: 'NEUTRAL' as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    keySupport: 'Identified on chart',
    keyResistance: 'Identified on chart',
    suggestedStopLoss: 'Structural swing invalidation',
    suggestedTarget: 'Next liquidity pool',
    riskReward: '1:2+',
    pattern: 'Price Action Setup',
  };

  try {
    const jsonMatch = result.text.match(/```json([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1].trim());
      summary = { ...summary, ...parsed };
    }
  } catch {
    // Non-fatal if JSON parsing fails
  }

  // Strip raw JSON block from displayed markdown analysis for clean UI presentation
  const cleanedAnalysis = result.text.replace(/```json[\s\S]*?```/, '').trim();

  return {
    analysis: cleanedAnalysis,
    summary,
    provider: result.provider,
  };
}
