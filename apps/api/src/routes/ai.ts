// ──────────────────────────────────────────────
// TradeMind — AI Feature Routes
//
// Endpoints:
//   POST /ai/analyze/:tradeId  → Trade Autopsy
//   GET  /ai/shield            → Behavioral Shield check
//   GET  /ai/debrief           → Daily Post-Market Debrief
//   GET  /ai/status            → Provider status check
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { runTradeAutopsy } from '../services/ai/autopsy.service';
import { runBehavioralShield } from '../services/ai/shield.service';
import { getDailyDebrief } from '../services/ai/debrief.service';
import { generateJournalAutofill, applyBatchJournalAutofill } from '../services/ai/autofill.service';
import { handleAssistantChat, handleChartAnalysis, getTraderLiveContext } from '../services/ai/chat.service';
import { generateStrategyFromPrompt } from '../services/ai/strategy-generator.service';
import { isAiConfigured } from '../services/ai/ai.client';

export const aiRouter = new Hono();
aiRouter.use('*', authMiddleware);

/**
 * GET /ai/status — Check which AI providers are configured
 */
aiRouter.get('/status', (c) => {
  return c.json({
    success: true,
    data: {
      configured: isAiConfigured(),
      providers: {
        gemini: !!process.env.GEMINI_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
      },
    },
  });
});

/**
 * POST /ai/analyze/:tradeId — Run Trade Autopsy
 *
 * Returns AI-graded analysis: Process Grade (A–F),
 * Execution Leak, and 3 actionable improvement points.
 * Results are cached 24h — fast on repeated calls.
 */
aiRouter.post('/analyze/:tradeId', async (c) => {
  const user = c.get('user');
  const tradeId = c.req.param('tradeId');

  if (!tradeId) {
    return c.json({ success: false, error: { message: 'Trade ID is required' } }, 400);
  }

  try {
    const result = await runTradeAutopsy(user.id, tradeId);

    if (!result) {
      return c.json(
        {
          success: false,
          error: {
            message: 'Trade not found, not owned by you, or still open. Only closed trades can be analyzed.',
          },
        },
        404,
      );
    }

    return c.json({ success: true, data: result });
  } catch (err) {
    console.error('[AI Autopsy Error]', err);
    return c.json(
      { success: false, error: { message: 'Failed to analyze trade. Please try again.' } },
      500,
    );
  }
});

/**
 * GET /ai/shield — Behavioral Shield check
 *
 * Analyzes last 48h of trading for dangerous behavioral patterns:
 * revenge trading, overtrading, overconfidence, emotion cascades.
 * Pure algorithmic — zero LLM cost.
 */
aiRouter.get('/shield', async (c) => {
  const user = c.get('user');

  try {
    const result = await runBehavioralShield(user.id);
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error('[Behavioral Shield Error]', err);
    return c.json(
      { success: false, error: { message: 'Failed to run behavioral shield check.' } },
      500,
    );
  }
});

/**
 * GET /ai/debrief — Daily Post-Market Debrief
 *
 * Returns today's AI-generated executive summary.
 * Cached until midnight — one LLM call per day max.
 * Returns null if no trades recorded today.
 */
aiRouter.get('/debrief', async (c) => {
  const user = c.get('user');

  try {
    const result = await getDailyDebrief(user.id);

    if (!result) {
      return c.json({
        success: true,
        data: null,
        message: 'No closed trades recorded today. Start trading to generate your daily debrief.',
      });
    }

    return c.json({ success: true, data: result });
  } catch (err) {
    console.error('[Daily Debrief Error]', err);
    return c.json(
      { success: false, error: { message: 'Failed to generate daily debrief.' } },
      500,
    );
  }
});

/**
 * POST /ai/autofill/:tradeId — Generate 1-Click AI Journal Entry
 */
aiRouter.post('/autofill/:tradeId', async (c) => {
  const user = c.get('user');
  const tradeId = c.req.param('tradeId');

  if (!tradeId) {
    return c.json({ success: false, error: { message: 'Trade ID is required' } }, 400);
  }

  try {
    const result = await generateJournalAutofill(user.id, tradeId);
    if (!result) {
      return c.json(
        { success: false, error: { message: 'Trade not found or not owned by you.' } },
        404,
      );
    }
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error('[AI Autofill Error]', err);
    return c.json(
      { success: false, error: { message: 'Failed to generate journal autofill.' } },
      500,
    );
  }
});

/**
 * POST /ai/batch-autofill — Batch auto-journal multiple unlogged trades
 */
aiRouter.post('/batch-autofill', async (c) => {
  const user = c.get('user');

  try {
    let tradeIds: string[] | undefined;
    const body = await c.req.json().catch(() => null);
    if (body && Array.isArray(body.tradeIds)) {
      tradeIds = body.tradeIds;
    }

    const result = await applyBatchJournalAutofill(user.id, tradeIds);
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error('[AI Batch Autofill Error]', err);
    return c.json(
      { success: false, error: { message: 'Failed to run batch journal autofill.' } },
      500,
    );
  }
});

/**
 * GET /ai/live-context — Get current trader context stats for assistant chip
 */
aiRouter.get('/live-context', async (c) => {
  const user = c.get('user');
  try {
    const context = await getTraderLiveContext(user.id);
    return c.json({ success: true, data: context });
  } catch (err) {
    console.error('[AI Context Error]', err);
    return c.json({ success: false, error: { message: 'Failed to fetch live context' } }, 500);
  }
});

/**
 * POST /ai/chat — Conversational AI Copilot with full trader context
 */
aiRouter.post('/chat', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return c.json({ success: false, error: { message: 'Message is required' } }, 400);
  }

  const history = Array.isArray(body.history) ? body.history : [];

  try {
    const response = await handleAssistantChat(user.id, history, body.message.trim());
    return c.json({ success: true, data: response });
  } catch (err: any) {
    console.error('[AI Chat Error]', err);
    return c.json(
      { success: false, error: { message: err?.message ?? 'Failed to get response from AI assistant' } },
      500,
    );
  }
});

/**
 * POST /ai/chart-analyze — Multimodal institutional chart breakdown
 */
aiRouter.post('/chart-analyze', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body.imageBase64 !== 'string' || !body.imageBase64.trim()) {
    return c.json({ success: false, error: { message: 'imageBase64 is required' } }, 400);
  }

  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'image/png';
  const notes = typeof body.notes === 'string' ? body.notes : undefined;

  try {
    const result = await handleChartAnalysis(user.id, body.imageBase64, mimeType, notes);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[AI Chart Analysis Error]', err);
    return c.json(
      {
        success: false,
        error: { message: err?.message ?? 'Failed to analyze chart screenshot. Please ensure Gemini API key is set.' },
      },
      500,
    );
  }
});

/**
 * POST /ai/strategy-generate — Generate structured strategy from plain English
 */
aiRouter.post('/strategy-generate', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return c.json({ success: false, error: { message: 'Strategy prompt description is required' } }, 400);
  }

  try {
    const result = await generateStrategyFromPrompt(user.id, body.prompt);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[AI Strategy Generation Error]', err);
    return c.json(
      { success: false, error: { message: err?.message ?? 'Failed to generate strategy' } },
      500,
    );
  }
});


