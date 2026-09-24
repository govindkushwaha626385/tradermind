// ──────────────────────────────────────────────
// TradeMind — AI Feature Routes
// POST /api/v1/ai/analyze/:tradeId
// GET  /api/v1/ai/shield
// GET  /api/v1/ai/debrief
// POST /api/v1/ai/autofill/:tradeId
// POST /api/v1/ai/batch-autofill
// GET  /api/v1/ai/live-context
// POST /api/v1/ai/chat
// POST /api/v1/ai/chart-analyze
// POST /api/v1/ai/strategy-generate
// GET  /api/v1/ai/status
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, notFound, apiError } from '@/lib/server/response';
import { runTradeAutopsy } from '@/lib/server/services/ai/autopsy.service';
import { runBehavioralShield } from '@/lib/server/services/ai/shield.service';
import { getDailyDebrief } from '@/lib/server/services/ai/debrief.service';
import { generateJournalAutofill, applyBatchJournalAutofill } from '@/lib/server/services/ai/autofill.service';
import { handleAssistantChat, handleChartAnalysis, getTraderLiveContext } from '@/lib/server/services/ai/chat.service';
import { generateStrategyFromPrompt } from '@/lib/server/services/ai/strategy-generator.service';
import { isAiConfigured } from '@/lib/server/services/ai/ai.client';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const action = path?.[0];

  switch (action) {
    case 'status':
      return ok({ configured: isAiConfigured(), providers: { gemini: !!process.env.GEMINI_API_KEY, groq: !!process.env.GROQ_API_KEY } });
    case 'shield': {
      try {
        const result = await runBehavioralShield(user.id);
        return ok(result);
      } catch (err) {
        console.error('[Behavioral Shield Error]', err);
        return apiError('Failed to run behavioral shield check.', 500);
      }
    }
    case 'debrief': {
      try {
        const result = await getDailyDebrief(user.id);
        if (!result) return ok(null);
        return ok(result);
      } catch (err) {
        console.error('[Daily Debrief Error]', err);
        return apiError('Failed to generate daily debrief.', 500);
      }
    }
    case 'live-context': {
      try {
        const context = await getTraderLiveContext(user.id);
        return ok(context);
      } catch (err) {
        console.error('[AI Context Error]', err);
        return apiError('Failed to fetch live context', 500);
      }
    }
    default:
      return apiError(`Route not found: GET /api/v1/ai/${action}`, 404);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { user, error } = await authenticate(req);
  if (error) return error;
  const rl = await checkRateLimit(req, user.id);
  if (rl) return rl;

  const { path } = await params;
  const [action, tradeId] = path ?? [];

  switch (action) {
    case 'analyze': {
      if (!tradeId) return apiError('Trade ID is required');
      try {
        const result = await runTradeAutopsy(user.id, tradeId);
        if (!result) return notFound('Trade not found or not owned by you.');
        return ok(result);
      } catch (err) {
        console.error('[AI Autopsy Error]', err);
        return apiError('Failed to analyze trade. Please try again.', 500);
      }
    }
    case 'autofill': {
      if (!tradeId) return apiError('Trade ID is required');
      try {
        const result = await generateJournalAutofill(user.id, tradeId);
        if (!result) return notFound('Trade not found or not owned by you.');
        return ok(result);
      } catch (err) {
        console.error('[AI Autofill Error]', err);
        return apiError('Failed to generate journal autofill.', 500);
      }
    }
    case 'batch-autofill': {
      try {
        const body = await req.json().catch(() => null);
        const tradeIds: string[] | undefined = Array.isArray(body?.tradeIds) ? body.tradeIds : undefined;
        const result = await applyBatchJournalAutofill(user.id, tradeIds);
        return ok(result);
      } catch (err) {
        console.error('[AI Batch Autofill Error]', err);
        return apiError('Failed to run batch journal autofill.', 500);
      }
    }
    case 'chat': {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.message !== 'string' || !body.message.trim()) return apiError('Message is required');
      const history = Array.isArray(body.history) ? body.history : [];
      try {
        const response = await handleAssistantChat(user.id, history, body.message.trim());
        return ok(response);
      } catch (err: any) {
        console.error('[AI Chat Error]', err);
        return apiError(err?.message ?? 'Failed to get response from AI assistant', 500);
      }
    }
    case 'chart-analyze': {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.imageBase64 !== 'string' || !body.imageBase64.trim()) return apiError('imageBase64 is required');
      try {
        const result = await handleChartAnalysis(user.id, body.imageBase64, body.mimeType ?? 'image/png', body.notes);
        return ok(result);
      } catch (err: any) {
        console.error('[AI Chart Analysis Error]', err);
        return apiError(err?.message ?? 'Failed to analyze chart screenshot. Please ensure Gemini API key is set.', 500);
      }
    }
    case 'strategy-generate': {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.prompt !== 'string' || !body.prompt.trim()) return apiError('Strategy prompt description is required');
      try {
        const result = await generateStrategyFromPrompt(user.id, body.prompt);
        return ok(result);
      } catch (err: any) {
        console.error('[AI Strategy Generation Error]', err);
        return apiError(err?.message ?? 'Failed to generate strategy', 500);
      }
    }
    default:
      return apiError(`Route not found: POST /api/v1/ai/${action}`, 404);
  }
}
