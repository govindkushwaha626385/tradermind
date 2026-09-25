// ──────────────────────────────────────────────
// TradeMind — Public Certificate Verification API Route
// GET   /api/v1/verify/[certificateId] — Fetch verified certificate
// POST  /api/v1/verify/lookup          — Search / lookup certificate by hash
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { ok, notFound, apiError, parseBody } from '@/lib/server/response';
import { verifyCertificate } from '@/lib/server/services/certificate-verification.service';
import { z } from 'zod';

export const runtime = 'nodejs';

const lookupSchema = z.object({
  query: z.string().min(1, 'Certificate ID or hash is required'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const rateLimitError = await checkRateLimit(req, undefined, 180);
    if (rateLimitError) return rateLimitError;

    const { path } = await params;
    const certId = path?.[0];

    if (!certId) {
      return apiError('Certificate ID is required', 400);
    }

    const result = await verifyCertificate(certId);
    if (!result) {
      return notFound('Certificate not found or hash is invalid');
    }

    return ok({ certificate: result });
  } catch (err: any) {
    console.error('[Verify GET] Error:', err);
    return apiError(err?.message || 'Verification service error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const rateLimitError = await checkRateLimit(req, undefined, 180);
    if (rateLimitError) return rateLimitError;

    const { path } = await params;
    const action = path?.[0] || 'lookup';

    if (action === 'lookup') {
      const { data: body, error: bodyErr } = await parseBody(req, lookupSchema);
      if (bodyErr) return bodyErr;

      const result = await verifyCertificate(body.query);
      if (!result) {
        return notFound('No matching certificate record found for this identifier or hash');
      }

      return ok({ certificate: result });
    }

    return apiError('Endpoint not found', 404);
  } catch (err: any) {
    console.error('[Verify POST] Error:', err);
    return apiError(err?.message || 'Verification service error', 500);
  }
}
