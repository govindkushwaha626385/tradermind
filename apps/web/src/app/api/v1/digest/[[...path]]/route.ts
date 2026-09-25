// ──────────────────────────────────────────────
// TradeMind — End-of-Day (EOD) Digest API Routes
// GET   /api/v1/digest/eod          — Fetch today's EOD digest for user
// POST  /api/v1/digest/eod/trigger  — Generate & trigger multi-channel dispatch
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, apiError, parseBody } from '@/lib/server/response';
import {
  generateEodDigest,
  deliverEodDigestToUser,
  type MarketSession,
} from '@/lib/server/services/eod-digest.service';
import { z } from 'zod';

export const runtime = 'nodejs';

const triggerSchema = z.object({
  session: z.enum(['IST', 'EST', 'UTC', 'ALL']).optional().default('ALL'),
  channels: z.array(z.enum(['in_app', 'webhook', 'email', 'push'])).optional().default(['in_app', 'webhook', 'email']),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const rateLimitError = await checkRateLimit(req, user.id);
    if (rateLimitError) return rateLimitError;

    const { path } = await params;
    const subAction = path?.[0] || 'eod';

    if (subAction === 'eod') {
      const url = new URL(req.url);
      const sessionParam = (url.searchParams.get('session')?.toUpperCase() || 'ALL') as MarketSession;
      const validSession: MarketSession = ['IST', 'EST', 'UTC', 'ALL'].includes(sessionParam)
        ? sessionParam
        : 'ALL';

      const digest = await generateEodDigest(user.id, validSession);
      return ok({ digest });
    }

    return apiError('Endpoint not found', 404);
  } catch (err: any) {
    console.error('[EOD Digest GET] Error:', err);
    return apiError(err?.message || 'Failed to retrieve EOD digest', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    const rateLimitError = await checkRateLimit(req, user.id);
    if (rateLimitError) return rateLimitError;

    const { path } = await params;
    const action = path?.[0] || 'eod';
    const subAction = path?.[1];

    if (action === 'eod' && (subAction === 'trigger' || !subAction)) {
      const { data: body } = await parseBody(req, triggerSchema);
      const session = (body?.session || 'ALL') as MarketSession;
      const channels = body?.channels || ['in_app', 'webhook', 'email'];

      // 1. Generate fresh EOD digest
      const digest = await generateEodDigest(user.id, session);

      // 2. Deliver across requested channels
      const delivery = await deliverEodDigestToUser(user.id, digest, channels);

      return ok({
        message: 'Post-market EOD Trade Digest generated & dispatched successfully!',
        digest,
        delivery,
      });
    }

    return apiError('Endpoint not found', 404);
  } catch (err: any) {
    console.error('[EOD Digest POST] Error:', err);
    return apiError(err?.message || 'Failed to dispatch EOD digest', 500);
  }
}
