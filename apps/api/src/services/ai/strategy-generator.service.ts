// ──────────────────────────────────────────────
// TradeMind — AI Strategy Generator Service
//
// Converts plain-English trader ideas into structured,
// production-ready trading strategies.
//
// Features:
// - Uses Gemini / Groq free tiers with robust JSON parsing
// - Built-in institutional NLP fallback so it never fails even without API keys
// - Full schema compatibility with trading_strategies table
// ──────────────────────────────────────────────

import { aiGenerate } from './ai.client';
import { getDatabase, aiCache } from '@trademind/database';
import { eq, and } from 'drizzle-orm';

export interface GeneratedStrategy {
  name: string;
  description: string;
  marketType: 'EQUITY' | 'OPTIONS' | 'FUTURES' | 'CRYPTO' | 'COMMODITY';
  timeframe: 'SCALPING' | 'INTRADAY' | 'SWING' | 'POSITIONAL' | 'LONG_TERM';
  entryCriteria: string;
  exitCriteria: string;
  riskRewardRatio: number;
  maxLossPerTrade: number;
  maxDailyLoss: number;
  tags: string[];
}

/**
 * Institutional rule-based NLP fallback parser
 * Runs instantly with zero external dependencies and zero cost.
 */
function parseStrategyHeuristic(prompt: string): GeneratedStrategy {
  const lower = prompt.toLowerCase();

  // 1. Detect Market Type
  let marketType: GeneratedStrategy['marketType'] = 'EQUITY';
  if (/\b(?:option|calls?|puts?|ce|pe|strike|straddle|strangle|iron condor)s?\b/i.test(prompt)) {
    marketType = 'OPTIONS';
  } else if (/\b(?:futures?|fut|nifty fut|banknifty fut)\b/i.test(prompt)) {
    marketType = 'FUTURES';
  } else if (/\b(?:crypto|btc|eth|bitcoin|solana)\b/i.test(prompt)) {
    marketType = 'CRYPTO';
  } else if (/\b(?:gold|silver|crude|commodity|commodities|mcx)\b/i.test(prompt)) {
    marketType = 'COMMODITY';
  }

  // 2. Detect Timeframe
  let timeframe: GeneratedStrategy['timeframe'] = 'INTRADAY';
  if (/scalp|1\s*min|2\s*min|30\s*sec|ticks/i.test(prompt)) {
    timeframe = 'SCALPING';
  } else if (/swing|daily|multi-day|hold overnight/i.test(prompt)) {
    timeframe = 'SWING';
  } else if (/positional|weekly|monthly/i.test(prompt)) {
    timeframe = 'POSITIONAL';
  } else if (/long term|investing/i.test(prompt)) {
    timeframe = 'LONG_TERM';
  }

  // 3. Extract Risk Reward Ratio
  let riskRewardRatio = 2.0;
  const rrMatch = prompt.match(/1\s*[:/]\s*([0-9]+(?:\.[0-9]+)?)/i) || prompt.match(/([0-9]+(?:\.[0-9]+)?)\s*r\b/i);
  if (rrMatch && rrMatch[1]) {
    const val = parseFloat(rrMatch[1]);
    if (!isNaN(val) && val >= 0.5 && val <= 10) riskRewardRatio = val;
  }

  // 4. Extract Risk Percentages
  let maxLossPerTrade = 1.0;
  const lossMatch = prompt.match(/([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:(?:max\s+)?risk|(?:max\s+)?loss|per trade|loss per trade)/i);
  if (lossMatch && lossMatch[1]) {
    const val = parseFloat(lossMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 10) maxLossPerTrade = val;
  }

  let maxDailyLoss = 3.0;
  const dailyLossMatch = prompt.match(/([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:daily|max daily)/i);
  if (dailyLossMatch && dailyLossMatch[1]) {
    const val = parseFloat(dailyLossMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 20) maxDailyLoss = val;
  }

  // 5. Extract Title / Name
  let name = 'Custom Trading Strategy';
  if (lower.includes('breakout')) name = `${marketType === 'OPTIONS' ? 'Options' : ''} Momentum Breakout`;
  else if (lower.includes('ema') || lower.includes('moving average')) name = 'EMA Trend Following Setup';
  else if (lower.includes('reversal') || lower.includes('support') || lower.includes('resistance')) name = 'Support & Resistance Reversal';
  else if (lower.includes('scalp')) name = `${marketType} Scalping Engine`;
  else if (lower.includes('vwap')) name = 'VWAP Pullback & Rejection';
  else name = `${marketType} Strategy (${timeframe})`;

  // 6. Generate structured entry and exit rules
  const entryCriteria = prompt.length > 20
    ? `1. Signal Trigger: ${prompt}\n2. Verification: Ensure market volume aligns with direction.\n3. Confirmation: Candle close beyond setup trigger level.`
    : '1. Wait for setup confirmation.\n2. Enter on candle close in the direction of the trend.';

  const exitCriteria = `1. Target Profit: ${riskRewardRatio}:1 Risk-to-Reward ratio target reached.\n2. Stop Loss: Immediate invalidation if price crosses opposite swing pivot.\n3. Trailing Stop: Lock 50% profit at 1:1 R, trail balance.`;

  // 7. Extract Tags
  const tags: string[] = [marketType.toLowerCase(), timeframe.toLowerCase()];
  if (/ema|sma/i.test(prompt)) tags.push('moving-averages');
  if (/rsi/i.test(prompt)) tags.push('rsi');
  if (/vwap/i.test(prompt)) tags.push('vwap');
  if (/breakout/i.test(prompt)) tags.push('breakout');
  if (/price action/i.test(prompt)) tags.push('price-action');

  return {
    name,
    description: `Automated strategy generated from trader specification: "${prompt.slice(0, 150)}${prompt.length > 150 ? '...' : ''}"`,
    marketType,
    timeframe,
    entryCriteria,
    exitCriteria,
    riskRewardRatio,
    maxLossPerTrade,
    maxDailyLoss,
    tags: Array.from(new Set(tags)).slice(0, 6),
  };
}

/**
 * Generate a structured trading strategy from a natural language prompt
 */
export async function generateStrategyFromPrompt(
  _userId: string,
  userPrompt: string,
): Promise<GeneratedStrategy> {
  const cleanPrompt = userPrompt.trim();
  if (!cleanPrompt) {
    throw new Error('Please describe your strategy idea');
  }

  const cacheKey = `strategy:${Buffer.from(cleanPrompt.toLowerCase()).toString('base64').slice(0, 80)}`;
  try {
    const db = getDatabase();
    const [cached] = await db
      .select()
      .from(aiCache)
      .where(and(eq(aiCache.userId, _userId), eq(aiCache.cacheKey, cacheKey)))
      .limit(1);

    if (cached && new Date(cached.expiresAt) > new Date()) {
      return cached.result as GeneratedStrategy;
    }
  } catch {
    // DB unreachable or in isolated unit test
  }

  // System instruction for JSON-structured response
  const aiPrompt = `You are an elite quantitative trading strategy architect and risk manager.
A trader has described their trading strategy idea in plain English:
"""
${cleanPrompt}
"""

Synthesize this description into a production-ready, highly structured trading strategy.
You MUST output ONLY a valid JSON object matching this exact schema:
{
  "name": "Concise, professional strategy title (e.g. 5-Min Nifty EMA Scalper)",
  "description": "Clear 2-3 sentence overview of the strategy edge, thesis, and optimal market conditions",
  "marketType": "EQUITY" | "OPTIONS" | "FUTURES" | "CRYPTO" | "COMMODITY",
  "timeframe": "SCALPING" | "INTRADAY" | "SWING" | "POSITIONAL" | "LONG_TERM",
  "entryCriteria": "Numbered, unambiguous entry triggers with exact indicator levels or price action conditions",
  "exitCriteria": "Numbered profit-taking rules, stop loss placement, and trailing stop guidelines",
  "riskRewardRatio": 2.0,
  "maxLossPerTrade": 1.0,
  "maxDailyLoss": 3.0,
  "tags": ["tag1", "tag2", "tag3"]
}

Important Rules:
- Return ONLY pure JSON. No markdown backticks, no explanations.
- Ensure riskRewardRatio is a number between 1.0 and 10.0.
- Ensure maxLossPerTrade is between 0.5 and 5.0 (percentage of capital).
- Ensure maxDailyLoss is between 1.0 and 10.0.
- Tags should be lowercase and hyphenated (e.g. "nifty-options", "ema-crossover").`;

  try {
    const result = await aiGenerate({
      prompt: aiPrompt,
      maxOutputTokens: 600,
      temperature: 0.3,
    });

    if (result && result.text) {
      let rawJson = result.text.trim();
      if (rawJson.startsWith('```')) {
        rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      }

      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed.name === 'string') {
        const validMarketTypes = ['EQUITY', 'OPTIONS', 'FUTURES', 'CRYPTO', 'COMMODITY'];
        const validTimeframes = ['SCALPING', 'INTRADAY', 'SWING', 'POSITIONAL', 'LONG_TERM'];

        const strategy: GeneratedStrategy = {
          name: String(parsed.name).slice(0, 100),
          description: String(parsed.description ?? '').slice(0, 1000),
          marketType: validMarketTypes.includes(parsed.marketType) ? parsed.marketType : 'EQUITY',
          timeframe: validTimeframes.includes(parsed.timeframe) ? parsed.timeframe : 'INTRADAY',
          entryCriteria: String(parsed.entryCriteria ?? '').slice(0, 3000),
          exitCriteria: String(parsed.exitCriteria ?? '').slice(0, 3000),
          riskRewardRatio: Number(parsed.riskRewardRatio) || 2.0,
          maxLossPerTrade: Number(parsed.maxLossPerTrade) || 1.0,
          maxDailyLoss: Number(parsed.maxDailyLoss) || 3.0,
          tags: Array.isArray(parsed.tags)
            ? parsed.tags.map((t: any) => String(t).toLowerCase().slice(0, 30)).slice(0, 8)
            : ['automated-strategy'],
        };

        try {
          const db = getDatabase();
          await db
            .insert(aiCache)
            .values({
              userId: _userId,
              cacheKey,
              result: strategy as any,
              provider: result.provider,
              tokensUsed: result.tokensUsed,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            })
            .onConflictDoNothing();
        } catch {
          // Ignore cache save error
        }

        return strategy;
      }
    }
  } catch (err) {
    console.warn('[AI Strategy Generator] LLM parsing failed, using heuristic parser:', (err as Error).message);
  }

  // Fallback to high-precision heuristic parser
  const fallback = parseStrategyHeuristic(cleanPrompt);
  try {
    const db = getDatabase();
    await db
      .insert(aiCache)
      .values({
        userId: _userId,
        cacheKey,
        result: fallback as any,
        provider: 'heuristic',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing();
  } catch {
    // Ignore cache save error
  }
  return fallback;
}
